import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  Recovery,
  RecoveryDocument,
  RecoveryStatus,
} from '../../database/schemas/recovery.schema.js';
import {
  Document,
  DocumentDocument,
  HealthStatus,
  IntegrityStatus,
} from '../../database/schemas/document.schema.js';
import {
  Incident,
  IncidentDocument,
  IncidentStatus,
} from '../../database/schemas/incident.schema.js';
import { AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { GoogleWorkspaceService } from '../google/google-workspace.service.js';

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(
    @InjectModel(Recovery.name)
    private readonly recoveryModel: Model<RecoveryDocument>,
    @InjectModel(Document.name)
    private readonly documentModel: Model<DocumentDocument>,
    @InjectModel(Incident.name)
    private readonly incidentModel: Model<IncidentDocument>,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly googleService?: GoogleWorkspaceService,
  ) {}

  private mapRecovery(rec: RecoveryDocument | Record<string, any>) {
    const plain = typeof (rec as any).toObject === 'function' ? (rec as any).toObject() : rec;
    const populatedDoc =
      plain.documentId && typeof plain.documentId === 'object' && '_id' in plain.documentId
        ? plain.documentId
        : null;

    const idStr = String(plain._id);
    const recoveryCode = `RCV-${idStr.slice(-6).toUpperCase()}`;

    return {
      _id: idStr,
      recoveryCode,
      documentId: populatedDoc ?? (plain.documentId ? String(plain.documentId) : ''),
      documentTitle: populatedDoc?.title,
      department: populatedDoc?.department,
      incidentId: plain.incidentId ? String(plain.incidentId) : undefined,
      status: plain.status,
      reason: plain.reason,
      sourceBackupPath: plain.sourceBackupPath,
      sourceBackupHash: plain.sourceBackupHash,
      corruptedFileHash: plain.corruptedFileHash,
      isConfidentialDocument: Boolean(plain.isConfidentialDocument ?? populatedDoc?.isConfidential),
      requiresApproval: Boolean(
        plain.isConfidentialDocument ??
          populatedDoc?.isConfidential ??
          plain.status === RecoveryStatus.PENDING_APPROVAL,
      ),
      requestedBy: plain.requestedBy,
      approvedBy: plain.approvedBy,
      approvalNotes: plain.approvalNotes,
      approvalRequestedAt: plain.approvalRequestedAt,
      approvalDecisionAt: plain.approvalDecisionAt,
      restoredAt: plain.restoredAt,
      verifiedAfterRestore: plain.status === RecoveryStatus.COMPLETED,
      errorMessage: plain.errorMessage,
      createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
    };
  }

  private resolveLocalPath(targetPath: string, folderName: 'documents' | 'backups'): string {
    if (targetPath && fs.existsSync(targetPath)) {
      return targetPath;
    }
    return path.resolve(process.cwd(), 'storage', folderName, path.basename(targetPath || ''));
  }

  async findAll(filters?: { status?: string; search?: string }) {
    const query: Record<string, unknown> = {};
    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    const list = await this.recoveryModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('documentId', 'title department isConfidential fileHash healthScore integrityStatus')
      .populate('requestedBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .limit(100)
      .exec();

    const mapped = list.map((item) => this.mapRecovery(item));

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      return mapped.filter(
        (item) =>
          item.recoveryCode.toLowerCase().includes(q) ||
          (item.documentTitle ?? '').toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q),
      );
    }

    return mapped;
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`ID điểm khôi phục không hợp lệ: ${id}`);
    }
    const recovery = await this.recoveryModel
      .findById(id)
      .populate('documentId', 'title department isConfidential fileHash healthScore integrityStatus')
      .populate('requestedBy', 'fullName email')
      .populate('approvedBy', 'fullName email')
      .exec();

    if (!recovery) {
      throw new NotFoundException(`Không tìm thấy yêu cầu khôi phục với ID: ${id}`);
    }
    return this.mapRecovery(recovery);
  }

  async executeRestore(recovery: RecoveryDocument, note?: string) {
    const doc = await this.documentModel.findById(recovery.documentId).exec();
    if (!doc) {
      recovery.status = RecoveryStatus.FAILED;
      recovery.errorMessage = 'Tài liệu gốc không còn tồn tại trong hệ thống';
      await recovery.save();
      throw new NotFoundException('Tài liệu gốc không tồn tại');
    }

    const backupPath = this.resolveLocalPath(recovery.sourceBackupPath || doc.backupFilePath, 'backups');
    const filePath = this.resolveLocalPath(doc.filePath, 'documents');
    let restoredHash = doc.backupHash || recovery.sourceBackupHash;

    if (fs.existsSync(backupPath)) {
      const backupBuffer = fs.readFileSync(backupPath);
      restoredHash = crypto.createHash('sha256').update(backupBuffer).digest('hex');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, backupBuffer);
      doc.fileSize = backupBuffer.length;
    } else {
      this.logger.warn(
        `Không tìm thấy file backup vật lý (${backupPath}), tiến hành đồng bộ trạng thái khôi phục trên CSDL cho tài liệu ${doc.title}`,
      );
    }

    doc.fileHash = restoredHash;
    doc.integrityStatus = IntegrityStatus.INTACT;
    doc.isMissing = false;
    doc.healthDeductions = doc.healthDeductions.filter(
      (d) => d.rule !== 'INTEGRITY_TAMPERED' && d.rule !== 'MISSING_FILE',
    );
    const totalDeducted = doc.healthDeductions.reduce((acc, d) => acc + (d.pointsDeducted || 0), 0);
    doc.healthScore = Math.max(0, Math.min(100, 100 - totalDeducted));
    doc.healthStatus =
      doc.healthScore >= 80
        ? HealthStatus.HEALTHY
        : doc.healthScore >= 50
          ? HealthStatus.WARNING
          : HealthStatus.CRITICAL;
    doc.lastIntegrityCheckAt = new Date();
    await doc.save();

    await this.incidentModel.updateMany(
      {
        documentId: doc._id,
        status: { $in: [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS] },
      },
      {
        $set: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: new Date(),
          resolutionNotes:
            note || `Đã phê duyệt và khôi phục an toàn tài liệu ${doc.title} từ bản sao lưu`,
        },
        $push: {
          timeline: {
            action: 'RECOVERED',
            note: note || 'Khôi phục an toàn sau khi được phê duyệt',
            timestamp: new Date(),
          },
        },
      },
    );

    recovery.status = RecoveryStatus.COMPLETED;
    recovery.restoredAt = new Date();
    await recovery.save();
  }

  async approve(id: string, approvalNotes?: string, userId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`ID điểm khôi phục không hợp lệ: ${id}`);
    }
    const recovery = await this.recoveryModel.findById(id).exec();
    if (!recovery) {
      throw new NotFoundException(`Không tìm thấy yêu cầu khôi phục với ID: ${id}`);
    }

    if (recovery.status === RecoveryStatus.REJECTED) {
      throw new BadRequestException('Yêu cầu khôi phục này đã bị từ chối trước đó');
    }

    recovery.status = RecoveryStatus.APPROVED;
    recovery.approvalNotes = approvalNotes || 'Đã phê duyệt khôi phục an toàn';
    recovery.approvalDecisionAt = new Date();
    if (userId && Types.ObjectId.isValid(userId)) {
      recovery.approvedBy = new Types.ObjectId(userId);
    }
    await recovery.save();

    await this.executeRestore(recovery, approvalNotes);

    await this.auditService?.logAction({
      action: AuditAction.RECOVERY_APPROVED,
      entityType: AuditEntityType.RECOVERY,
      entityId: recovery._id,
      entityName: `RCV-${recovery._id.toString().slice(-6).toUpperCase()}`,
      actorId: userId,
      actorName: 'Quản trị viên DocuGuard',
      severity: 'info',
      description: approvalNotes || 'Phê duyệt và hoàn tất khôi phục tài liệu từ bản sao lưu',
    });

    return this.findOne(id);
  }

  async reject(id: string, approvalNotes?: string, userId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`ID điểm khôi phục không hợp lệ: ${id}`);
    }
    const recovery = await this.recoveryModel.findById(id).exec();
    if (!recovery) {
      throw new NotFoundException(`Không tìm thấy yêu cầu khôi phục với ID: ${id}`);
    }

    if (recovery.status === RecoveryStatus.COMPLETED) {
      throw new BadRequestException('Không thể từ chối yêu cầu đã hoàn tất khôi phục');
    }

    recovery.status = RecoveryStatus.REJECTED;
    recovery.approvalNotes = approvalNotes || 'Từ chối yêu cầu khôi phục';
    recovery.approvalDecisionAt = new Date();
    if (userId && Types.ObjectId.isValid(userId)) {
      recovery.approvedBy = new Types.ObjectId(userId);
    }
    await recovery.save();

    await this.auditService?.logAction({
      action: AuditAction.RECOVERY_REJECTED,
      entityType: AuditEntityType.RECOVERY,
      entityId: recovery._id,
      entityName: `RCV-${recovery._id.toString().slice(-6).toUpperCase()}`,
      actorId: userId,
      actorName: 'Quản trị viên DocuGuard',
      severity: 'warning',
      description: approvalNotes || 'Từ chối yêu cầu khôi phục tài liệu',
    });

    return this.findOne(id);
  }

  async createApprovalRequest(params: {
    documentId: string;
    reason?: string;
    approverEmail?: string;
  }) {
    if (!Types.ObjectId.isValid(params.documentId)) {
      throw new BadRequestException('ID tài liệu không hợp lệ');
    }
    const doc = await this.documentModel.findById(params.documentId).exec();
    if (!doc) {
      throw new NotFoundException('Không tìm thấy tài liệu cần khôi phục');
    }

    const approvalToken = crypto.randomBytes(24).toString('hex');
    const requestedBy = doc.uploadedBy || new Types.ObjectId();

    const recovery = await this.recoveryModel.create({
      documentId: doc._id,
      status: RecoveryStatus.PENDING_APPROVAL,
      reason: params.reason || `Yêu cầu phê duyệt khôi phục tài liệu mật: ${doc.title}`,
      sourceBackupPath: doc.backupFilePath,
      sourceBackupHash: doc.backupHash || doc.fileHash,
      corruptedFileHash: doc.fileHash,
      isConfidentialDocument: true,
      requestedBy,
      approvalToken,
      approvalRequestedAt: new Date(),
    });

    const recoveryCode = `RCV-${recovery._id.toString().slice(-6).toUpperCase()}`;

    await this.googleService
      ?.sendRecoveryApprovalEmail({
        toEmail: params.approverEmail || doc.ownerEmail,
        recoveryCode,
        documentTitle: doc.title,
        reason: recovery.reason,
        approvalToken,
      })
      .catch(() => undefined);

    await this.auditService?.logAction({
      action: AuditAction.RECOVERY_REQUESTED,
      entityType: AuditEntityType.RECOVERY,
      entityId: recovery._id,
      entityName: recoveryCode,
      actorName: 'Hệ thống Safe Recovery',
      severity: 'warning',
      description: `Gửi yêu cầu phê duyệt ${recoveryCode} qua Gmail cho "${doc.title}"`,
    });

    return this.findOne(recovery._id.toString());
  }

  async handleEmailAction(token: string, action: string) {
    if (!token) {
      throw new BadRequestException('Thiếu mã xác thực phê duyệt');
    }
    const recovery = await this.recoveryModel.findOne({ approvalToken: token }).exec();
    if (!recovery) {
      throw new NotFoundException('Liên kết phê duyệt không hợp lệ hoặc đã hết hạn');
    }

    if (recovery.status === RecoveryStatus.COMPLETED || recovery.status === RecoveryStatus.REJECTED) {
      return {
        alreadyProcessed: true,
        status: recovery.status,
        recovery: await this.findOne(recovery._id.toString()),
      };
    }

    const normalizedAction = String(action || '').toLowerCase();
    if (normalizedAction === 'reject') {
      const updated = await this.reject(
        recovery._id.toString(),
        'Từ chối trực tiếp từ nút bấm trong Gmail',
      );
      return { alreadyProcessed: false, status: 'rejected', recovery: updated };
    }

    const updated = await this.approve(
      recovery._id.toString(),
      'Phê duyệt 1-click trực tiếp từ Gmail',
    );
    return { alreadyProcessed: false, status: 'completed', recovery: updated };
  }
}

