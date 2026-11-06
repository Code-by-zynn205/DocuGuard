import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  Document,
  DocumentDocument,
  DocumentCategory,
  DocumentStatus,
  HealthStatus,
  IntegrityStatus,
  HealthDeduction,
} from '../../database/schemas/document.schema.js';
import { DocumentVersion, DocumentVersionDocument } from '../../database/schemas/document-version.schema.js';
import { Incident, IncidentDocument, IncidentSeverity, IncidentStatus, IncidentType } from '../../database/schemas/incident.schema.js';
import { Recovery, RecoveryDocument, RecoveryStatus } from '../../database/schemas/recovery.schema.js';
import { appConfig } from '../../config/app.config.js';
import { N8nClient } from '../../integrations/n8n/n8n.client.js';
import { CreateDocumentDto, UpdateDocumentHealthDto } from './dto/create-document.dto.js';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly storageDir: string;
  private readonly backupDir: string;

  constructor(
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    @InjectModel(DocumentVersion.name) private readonly versionModel: Model<DocumentVersionDocument>,
    @InjectModel(Incident.name) private readonly incidentModel: Model<IncidentDocument>,
    @InjectModel(Recovery.name) private readonly recoveryModel: Model<RecoveryDocument>,
    private readonly n8nClient: N8nClient,
  ) {
    this.storageDir = path.resolve(process.cwd(), appConfig.documentStoragePath);
    this.backupDir = path.resolve(this.storageDir, '..', 'backups');

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  calculateHealthScore(params: {
    description?: string;
    expiresAt?: Date | null;
    fileSize: number;
    integrityStatus?: IntegrityStatus;
  }): { score: number; status: HealthStatus; deductions: HealthDeduction[] } {
    let score = 100;
    const deductions: HealthDeduction[] = [];
    const now = new Date();

    // Rule 1: Thiếu mô tả tài liệu (-10 điểm)
    if (!params.description || params.description.trim() === '') {
      score -= 10;
      deductions.push({
        rule: 'MISSING_DESCRIPTION',
        reason: 'Tài liệu không có thông tin mô tả chi tiết',
        pointsDeducted: 10,
        detectedAt: now,
      });
    }

    // Rule 2 & 3: Kiểm tra hạn tài liệu
    if (params.expiresAt) {
      const expiresAt = new Date(params.expiresAt);
      const diffMs = expiresAt.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffMs < 0) {
        // Hết hạn (-35 điểm)
        score -= 35;
        deductions.push({
          rule: 'EXPIRED',
          reason: `Tài liệu đã hết hạn vào ngày ${expiresAt.toLocaleDateString('vi-VN')}`,
          pointsDeducted: 35,
          detectedAt: now,
        });
      } else if (diffDays <= 30) {
        // Sắp hết hạn trong vòng 30 ngày (-15 điểm)
        score -= 15;
        deductions.push({
          rule: 'EXPIRING_SOON',
          reason: `Tài liệu sắp hết hạn trong vòng ${diffDays} ngày tới`,
          pointsDeducted: 15,
          detectedAt: now,
        });
      }
    }

    // Rule 4: Tệp rỗng 0 bytes (-50 điểm)
    if (params.fileSize === 0) {
      score -= 50;
      deductions.push({
        rule: 'EMPTY_FILE',
        reason: 'Tệp tải lên rỗng (0 bytes)',
        pointsDeducted: 50,
        detectedAt: now,
      });
    }

    // Rule 5: Toàn vẹn dữ liệu
    if (params.integrityStatus === IntegrityStatus.TAMPERED) {
      score -= 50;
      deductions.push({
        rule: 'INTEGRITY_TAMPERED',
        reason: 'Phát hiện sai lệch mã băm SHA-256 so với bản gốc',
        pointsDeducted: 50,
        detectedAt: now,
      });
    } else if (params.integrityStatus === IntegrityStatus.MISSING) {
      score -= 60;
      deductions.push({
        rule: 'FILE_MISSING',
        reason: 'Tệp vật lý không tồn tại trên hệ thống lưu trữ',
        pointsDeducted: 60,
        detectedAt: now,
      });
    }

    score = Math.max(0, Math.min(100, score));

    let status = HealthStatus.HEALTHY;
    if (score < 50) {
      status = HealthStatus.CRITICAL;
    } else if (score < 80) {
      status = HealthStatus.WARNING;
    }

    return { score, status, deductions };
  }

  async create(file: Express.Multer.File, dto: CreateDocumentDto, userId?: string) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn một tệp để tải lên');
    }

    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageFileName = `${timestamp}_${safeName}`;
    const filePath = path.join(this.storageDir, storageFileName);

    const backupFileName = `${timestamp}_${safeName}.backup`;
    const backupFilePath = path.join(this.backupDir, backupFileName);

    // Lưu tệp chính
    fs.writeFileSync(filePath, file.buffer);
    // Tạo bản sao lưu an toàn (Safe Recovery)
    fs.writeFileSync(backupFilePath, file.buffer);

    const expiresDate = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    const issueDate = dto.issueDate ? new Date(dto.issueDate) : new Date();

    const health = this.calculateHealthScore({
      description: dto.description,
      expiresAt: expiresDate,
      fileSize: file.size,
      integrityStatus: IntegrityStatus.INTACT,
    });

    const parsedAppendices = typeof dto.requiredAppendices === 'string'
      ? dto.requiredAppendices.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(dto.requiredAppendices)
      ? dto.requiredAppendices
      : [];

    const parsedTags = typeof dto.tags === 'string'
      ? dto.tags.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(dto.tags)
      ? dto.tags
      : [];

    const isConfidential = dto.isConfidential === 'true' || dto.isConfidential === true;

    const doc = await this.documentModel.create({
      title: dto.title,
      description: dto.description || '',
      originalFileName: file.originalname,
      filePath,
      backupFilePath,
      backupHash: sha256,
      fileHash: sha256,
      mimeType: file.mimetype,
      fileSize: file.size,
      category: dto.category || DocumentCategory.OTHER,
      department: dto.department || 'Chung',
      issueDate,
      expiresAt: expiresDate,
      status: DocumentStatus.ACTIVE,
      isConfidential,
      healthScore: health.score,
      healthStatus: health.status,
      integrityStatus: IntegrityStatus.INTACT,
      healthDeductions: health.deductions,
      isMissing: false,
      isDuplicate: false,
      duplicateCount: 0,
      requiredAppendices: parsedAppendices,
      attachedAppendices: [],
      missingAppendices: parsedAppendices,
      hasMissingAppendix: parsedAppendices.length > 0,
      currentVersion: 1,
      uploadedBy: userId ? new Types.ObjectId(userId) : undefined,
      tags: parsedTags,
      lastHealthScanAt: new Date(),
      lastIntegrityCheckAt: new Date(),
    });

    // Tạo phiên bản 1 (DocumentVersion)
    await this.versionModel.create({
      documentId: doc._id,
      versionNumber: 1,
      originalFileName: file.originalname,
      filePath,
      fileHash: sha256,
      fileSize: file.size,
      mimeType: file.mimetype,
      changeReason: 'Tải lên phiên bản khởi tạo ban đầu',
      uploadedBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    // Bắn webhook sang n8n (chạy nền, không chặn request)
    this.n8nClient.triggerHealthScan({ documentId: String(doc._id), title: doc.title }).catch((err) => {
      this.logger.warn(`Không thể trigger n8n health scan: ${err.message}`);
    });

    return doc;
  }

  async findAll(query?: { category?: string; status?: string; search?: string }) {
    const filter: Record<string, unknown> = {};

    if (query?.category) {
      filter.category = query.category;
    }
    if (query?.status) {
      filter.status = query.status;
    } else {
      filter.status = { $ne: DocumentStatus.DELETED };
    }
    if (query?.search) {
      filter.title = { $regex: query.search, $options: 'i' };
    }

    return this.documentModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID tài liệu không hợp lệ');
    }
    const doc = await this.documentModel.findById(id).exec();
    if (!doc) {
      throw new NotFoundException(`Không tìm thấy tài liệu có ID ${id}`);
    }
    return doc;
  }

  async verifyIntegrity(id: string) {
    const doc = await this.findOne(id);

    if (!fs.existsSync(doc.filePath)) {
      doc.integrityStatus = IntegrityStatus.MISSING;
      doc.isMissing = true;
      const health = this.calculateHealthScore({
        description: doc.description,
        expiresAt: doc.expiresAt,
        fileSize: doc.fileSize,
        integrityStatus: IntegrityStatus.MISSING,
      });
      doc.healthScore = health.score;
      doc.healthStatus = health.status;
      doc.healthDeductions = health.deductions;
      doc.lastIntegrityCheckAt = new Date();
      await doc.save();

      // Tự động tạo Incident
      const incidentCode = `INC-${Date.now().toString().slice(-6)}`;
      await this.incidentModel.create({
        incidentCode,
        documentId: doc._id,
        title: `Tệp tài liệu bị thất lạc: ${doc.title}`,
        severity: IncidentSeverity.CRITICAL,
        type: IncidentType.MISSING_FILE,
        status: IncidentStatus.OPEN,
        description: `Không tìm thấy file lưu trữ tại đường dẫn ${doc.filePath}`,
        timeline: [
          {
            action: 'CREATED',
            note: 'Phát hiện sự cố khi kiểm tra tính toàn vẹn vật lý của tệp',
            timestamp: new Date(),
          },
        ],
      });

      return {
        intact: false,
        error: 'Tệp không tồn tại trong thư mục lưu trữ',
        document: doc,
      };
    }

    const fileBuffer = fs.readFileSync(doc.filePath);
    const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const isIntact = currentHash === doc.fileHash;

    doc.lastIntegrityCheckAt = new Date();

    if (isIntact) {
      doc.integrityStatus = IntegrityStatus.INTACT;
      doc.isMissing = false;
      await doc.save();

      return {
        intact: true,
        message: 'Tài liệu nguyên vẹn, mã băm SHA-256 hoàn toàn trùng khớp',
        fileHash: currentHash,
        document: doc,
      };
    } else {
      doc.integrityStatus = IntegrityStatus.TAMPERED;
      const health = this.calculateHealthScore({
        description: doc.description,
        expiresAt: doc.expiresAt,
        fileSize: fileBuffer.length,
        integrityStatus: IntegrityStatus.TAMPERED,
      });
      doc.healthScore = health.score;
      doc.healthStatus = health.status;
      doc.healthDeductions = health.deductions;
      await doc.save();

      // Tự động tạo sự cố nghiêm trọng (Incident)
      const incidentCode = `INC-${Date.now().toString().slice(-6)}`;
      const incident = await this.incidentModel.create({
        incidentCode,
        documentId: doc._id,
        title: `Phát hiện tệp bị chỉnh sửa trái phép: ${doc.title}`,
        severity: IncidentSeverity.CRITICAL,
        type: IncidentType.INTEGRITY_VIOLATION,
        status: IncidentStatus.OPEN,
        description: `Mã băm thực tế (${currentHash}) không khớp với mã băm ban đầu (${doc.fileHash})`,
        timeline: [
          {
            action: 'CREATED',
            note: 'Phát hiện xâm phạm toàn vẹn dữ liệu từ File Integrity Watcher',
            timestamp: new Date(),
          },
        ],
      });

      // Bắn webhook sang n8n tự động hóa xử lý sự cố
      this.n8nClient.triggerIncidentWorkflow({
        incidentId: incident._id.toString(),
        documentId: doc._id.toString(),
        title: doc.title,
        expectedHash: doc.fileHash,
        actualHash: currentHash,
      }).catch((err) => {
        this.logger.warn(`Không thể trigger n8n incident workflow: ${err.message}`);
      });

      return {
        intact: false,
        message: 'CẢNH BÁO: Tài liệu đã bị thay đổi trái phép hoặc tệp bị hỏng!',
        expectedHash: doc.fileHash,
        actualHash: currentHash,
        incidentCreated: incidentCode,
        document: doc,
      };
    }
  }

  async recover(id: string, reason?: string, userId?: string) {
    const doc = await this.findOne(id);

    if (!fs.existsSync(doc.backupFilePath)) {
      throw new BadRequestException('Không tìm thấy bản sao lưu an toàn của tài liệu này trên máy chủ');
    }

    // Đọc tệp backup và khôi phục vào file gốc
    const backupBuffer = fs.readFileSync(doc.backupFilePath);
    const backupHash = crypto.createHash('sha256').update(backupBuffer).digest('hex');

    fs.writeFileSync(doc.filePath, backupBuffer);

    doc.fileHash = backupHash;
    doc.integrityStatus = IntegrityStatus.INTACT;
    doc.isMissing = false;

    // Tính lại điểm sức khỏe sau khôi phục
    const health = this.calculateHealthScore({
      description: doc.description,
      expiresAt: doc.expiresAt,
      fileSize: backupBuffer.length,
      integrityStatus: IntegrityStatus.INTACT,
    });
    doc.healthScore = health.score;
    doc.healthStatus = health.status;
    doc.healthDeductions = health.deductions;
    doc.lastIntegrityCheckAt = new Date();
    await doc.save();

    // Tự động đóng các sự cố liên quan đến vi phạm toàn vẹn của tài liệu này
    await this.incidentModel.updateMany(
      {
        documentId: doc._id,
        status: { $in: [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS] },
      },
      {
        $set: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: new Date(),
          resolutionNotes: `Đã tự động khôi phục an toàn (Safe Recovery) từ bản sao lưu ${path.basename(doc.backupFilePath)}`,
        },
        $push: {
          timeline: {
            action: 'RECOVERED',
            note: reason || 'Khôi phục an toàn thành công từ Safe Recovery 1-click',
            timestamp: new Date(),
          },
        },
      },
    );

    // Ghi nhật ký vào bảng Recovery
    const defaultUserId = userId ? new Types.ObjectId(userId) : doc.uploadedBy || new Types.ObjectId();
    await this.recoveryModel.create({
      documentId: doc._id,
      status: RecoveryStatus.COMPLETED,
      reason: reason || 'Khôi phục an toàn 1-click sau khi phát hiện toàn vẹn dữ liệu bị xâm phạm',
      sourceBackupPath: doc.backupFilePath,
      sourceBackupHash: backupHash,
      isConfidentialDocument: doc.isConfidential,
      requestedBy: defaultUserId,
      restoredAt: new Date(),
    });

    return {
      success: true,
      message: 'Khôi phục tài liệu thành công từ bản sao lưu an toàn!',
      document: doc,
    };
  }

  async updateHealth(id: string, dto: UpdateDocumentHealthDto) {
    const doc = await this.findOne(id);
    doc.healthScore = Math.max(0, Math.min(100, dto.healthScore));
    if (dto.healthStatus) {
      doc.healthStatus = dto.healthStatus as HealthStatus;
    } else {
      if (doc.healthScore < 50) doc.healthStatus = HealthStatus.CRITICAL;
      else if (doc.healthScore < 80) doc.healthStatus = HealthStatus.WARNING;
      else doc.healthStatus = HealthStatus.HEALTHY;
    }
    if (dto.healthDeductions) {
      doc.healthDeductions = dto.healthDeductions.map((d) => ({
        ...d,
        detectedAt: new Date(),
      }));
    }
    doc.lastHealthScanAt = new Date();
    await doc.save();
    return doc;
  }

  async getFileStream(id: string) {
    const doc = await this.findOne(id);
    if (!fs.existsSync(doc.filePath)) {
      throw new NotFoundException('Tệp vật lý không tồn tại');
    }
    return {
      stream: fs.createReadStream(doc.filePath),
      fileName: doc.originalFileName,
      mimeType: doc.mimeType,
    };
  }
}
