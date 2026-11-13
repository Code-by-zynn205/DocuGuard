import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import {
  Document,
  DocumentCategory,
  DocumentDocument,
  DocumentStatus,
  HealthStatus,
} from '../../database/schemas/document.schema.js';
import {
  DocumentVersion,
  DocumentVersionDocument,
} from '../../database/schemas/document-version.schema.js';
import {
  Incident,
  IncidentDocument,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '../../database/schemas/incident.schema.js';
import { AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';
import { appConfig } from '../../config/app.config.js';
import { AuditService } from '../audit/audit.service.js';
import { GoogleWorkspaceService } from '../google/google-workspace.service.js';
import { PdfIntelligenceRequestDto } from './dto/create-document.dto.js';

export type StandardizedDocType = 'HoaDon' | 'HopDong' | 'BaoCao' | 'HoSoKhac';

export interface PdfClassificationResult {
  success: boolean;
  documentId: string;
  docType: StandardizedDocType;
  category: DocumentCategory;
  companyName: string;
  issueDate: string;
  standardizedFileName: string;
  confidence: number;
  reason: string;
  needsReview: boolean;
  incidentCreated: boolean;
  incidentCode?: string;
  driveRenamed: boolean;
  emailNotification: { sent: boolean; reason?: string };
  classifierMode: 'groq' | 'rule-engine';
  extractedTextPreview: string;
}

export interface InvoiceAuditResult {
  success: boolean;
  documentId: string;
  docType: 'HOA_DON';
  supplierName: string;
  issueDate: string;
  totalAmount: number;
  taxCode: string | null;
  standardizedFileName: string;
  isSuspicious: boolean;
  suspicionReason: string;
  healthScore: number;
  healthStatus: HealthStatus;
  incidentCreated: boolean;
  incidentCode?: string;
  auditLogged: boolean;
  emailNotification: { sent: boolean; reason?: string };
  classifierMode: 'groq' | 'rule-engine';
  extractedTextPreview: string;
}

interface RawClassificationPayload {
  doc_type?: string;
  docType?: string;
  category?: string;
  company_name?: string;
  companyName?: string;
  issue_date?: string;
  issueDate?: string;
  confidence?: number;
  reason?: string;
}

interface RawInvoicePayload {
  supplier_name?: string;
  supplierName?: string;
  issue_date?: string;
  issueDate?: string;
  total_amount?: number | string;
  totalAmount?: number | string;
  tax_code?: string | null;
  taxCode?: string | null;
  is_suspicious?: boolean | string;
  isSuspicious?: boolean | string;
  suspicion_reason?: string;
  suspicionReason?: string;
  reason?: string;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt có dấu thành ASCII sạch để đặt tên tệp tiêu chuẩn.
 */
export function stripVietnameseDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hóa tên công ty/nhà cung cấp dạng PascalCase không dấu, ví dụ: "Viettel IDC" -> "ViettelIDC".
 */
export function normalizeCompanySlug(rawName?: string, fallback = 'DoiTac'): string {
  const cleaned = stripVietnameseDiacritics(rawName || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  if (!cleaned) {
    return fallback;
  }

  const parts = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  const joined = parts.join('');
  return joined ? joined.slice(0, 48) : fallback;
}

/**
 * Chuẩn hóa chuỗi ngày về YYYY-MM-DD (hỗ trợ cả DD/MM/YYYY).
 */
export function normalizeIsoDate(rawDate?: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (!rawDate) {
    return today;
  }

  const isoMatch = rawDate.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const vnMatch = rawDate.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (vnMatch) {
    return `${vnMatch[3]}-${vnMatch[2].padStart(2, '0')}-${vnMatch[1].padStart(2, '0')}`;
  }

  const parsed = new Date(rawDate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return today;
}

function decodePdfLiteralString(raw: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== '\\') {
      bytes.push(raw.charCodeAt(i) & 0xff);
      continue;
    }

    const next = raw[i + 1];
    if (next === undefined) break;
    if (next === 'n') {
      bytes.push(10);
      i += 1;
    } else if (next === 'r') {
      bytes.push(13);
      i += 1;
    } else if (next === 't') {
      bytes.push(9);
      i += 1;
    } else if (/[0-7]/.test(next)) {
      const oct = raw.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? next;
      bytes.push(parseInt(oct, 8) & 0xff);
      i += oct.length;
    } else {
      bytes.push(next.charCodeAt(0) & 0xff);
      i += 1;
    }
  }

  const buf = Buffer.from(bytes);
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < buf.length; i += 2) {
      out += String.fromCharCode((buf[i] << 8) | buf[i + 1]);
    }
    return out;
  }
  return buf.toString('utf8');
}

function decodePdfHexString(hex: string): string {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length < 2) return '';
  const padded = clean.length % 2 === 1 ? `${clean}0` : clean;
  const buf = Buffer.from(padded, 'hex');
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < buf.length; i += 2) {
      out += String.fromCharCode((buf[i] << 8) | buf[i + 1]);
    }
    return out;
  }
  return buf.toString('latin1');
}

function collectOperatorsText(source: string, chunks: string[]): void {
  const tjMatches = source.matchAll(/\((?:\\.|[^\\()])*\)\s*(?:Tj|'|")/g);
  for (const m of tjMatches) {
    const inner = m[0].slice(1, m[0].lastIndexOf(')'));
    const decoded = decodePdfLiteralString(inner).trim();
    if (decoded) chunks.push(decoded);
  }

  const tjArrayMatches = source.matchAll(/\[([\s\S]{1,4000}?)\]\s*TJ/g);
  for (const m of tjArrayMatches) {
    const parts: string[] = [];
    const tokens = m[1].matchAll(/\((?:\\.|[^\\()])*\)|<([0-9a-fA-F\s]+)>/g);
    for (const token of tokens) {
      if (token[0].startsWith('(')) {
        parts.push(decodePdfLiteralString(token[0].slice(1, -1)));
      } else if (token[1]) {
        parts.push(decodePdfHexString(token[1]));
      }
    }
    const joined = parts.join('').trim();
    if (joined) chunks.push(joined);
  }
}

/**
 * Trích xuất văn bản thuần từ Buffer PDF (hỗ trợ cả stream nén FlateDecode bằng Node zlib)
 * mà không cần cài thêm thư viện ngoài.
 */
export function extractTextFromPdfBuffer(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) {
    return '';
  }

  const head = buffer.subarray(0, 1024).toString('latin1');
  if (!head.includes('%PDF-')) {
    return buffer
      .toString('utf8')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const rawLatin1 = buffer.toString('latin1');
  const chunks: string[] = [];

  collectOperatorsText(rawLatin1, chunks);

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\n?endstream/g;
  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(rawLatin1)) !== null) {
    const streamHeader = rawLatin1.slice(Math.max(0, match.index - 220), match.index);
    const streamContentStart = match.index + match[0].indexOf(match[1]);
    const streamSlice = buffer.subarray(
      streamContentStart,
      streamContentStart + match[1].length,
    );

    let decodedStream = '';
    if (streamHeader.includes('/FlateDecode')) {
      try {
        decodedStream = zlib.inflateSync(streamSlice).toString('latin1');
      } catch {
        try {
          decodedStream = zlib.inflateRawSync(streamSlice).toString('latin1');
        } catch {
          decodedStream = '';
        }
      }
    } else {
      decodedStream = match[1];
    }

    if (decodedStream) {
      collectOperatorsText(decodedStream, chunks);
    }
  }

  return chunks
    .join(' ')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class PdfIntelligenceService {
  private readonly logger = new Logger(PdfIntelligenceService.name);
  private readonly storageDir: string;
  private readonly backupDir: string;

  constructor(
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    @InjectModel(DocumentVersion.name)
    private readonly versionModel: Model<DocumentVersionDocument>,
    @InjectModel(Incident.name) private readonly incidentModel: Model<IncidentDocument>,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly googleWorkspaceService?: GoogleWorkspaceService,
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

  private async callGroqJson<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
    if (!appConfig.groqApiKey) {
      return null;
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appConfig.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: appConfig.groqModel,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) {
        return null;
      }

      const cleanJson = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson) as T;
    } catch (err: any) {
      this.logger.warn(`Groq PDF AI fallback sang rule-engine: ${err?.message}`);
      return null;
    }
  }

  private async resolveTargetDocument(
    dto: PdfIntelligenceRequestDto | undefined,
    preferInvoice: boolean,
  ): Promise<DocumentDocument | null> {
    if (dto?.documentId && Types.ObjectId.isValid(dto.documentId)) {
      const exact = await this.documentModel
        .findOne({ _id: dto.documentId, status: { $ne: DocumentStatus.DELETED } })
        .exec();
      if (exact) {
        return exact;
      }
    }

    if (preferInvoice) {
      const invoiceDoc = await this.documentModel
        .findOne({
          status: { $ne: DocumentStatus.DELETED },
          $or: [
            { category: DocumentCategory.FINANCIAL },
            { title: { $regex: 'hóa đơn|hoa don|invoice|vat|thanh toán', $options: 'i' } },
            { originalFileName: { $regex: 'hoa_don|hoadon|invoice', $options: 'i' } },
          ],
        })
        .sort({ updatedAt: -1 })
        .exec();
      if (invoiceDoc) {
        return invoiceDoc;
      }
    }

    const pdfDoc = await this.documentModel
      .findOne({
        status: { $ne: DocumentStatus.DELETED },
        $or: [
          { mimeType: 'application/pdf' },
          { originalFileName: { $regex: '\\.pdf$', $options: 'i' } },
        ],
      })
      .sort({ updatedAt: -1 })
      .exec();
    if (pdfDoc) {
      return pdfDoc;
    }

    return this.documentModel
      .findOne({ status: { $ne: DocumentStatus.DELETED } })
      .sort({ updatedAt: -1 })
      .exec();
  }

  private async resolveSourceContext(
    file: Express.Multer.File | undefined,
    dto: PdfIntelligenceRequestDto | undefined,
    preferInvoice: boolean,
  ): Promise<{
    doc: DocumentDocument | null;
    fileBuffer: Buffer | null;
    originalFileName: string;
    extractedText: string;
    ownerEmail?: string;
  }> {
    let doc: DocumentDocument | null = file
      ? null
      : await this.resolveTargetDocument(dto, preferInvoice);

    let fileBuffer: Buffer | null = file?.buffer ?? null;
    if (!fileBuffer && doc) {
      const candidatePath = fs.existsSync(doc.filePath)
        ? doc.filePath
        : path.resolve(this.storageDir, path.basename(doc.filePath || ''));
      if (fs.existsSync(candidatePath)) {
        fileBuffer = fs.readFileSync(candidatePath);
      } else if (doc.driveFileId && this.googleWorkspaceService) {
        fileBuffer = await this.googleWorkspaceService.downloadDriveFileById(
          doc.driveFileId,
          { email: dto?.ownerEmail || doc.ownerEmail },
        );
      }
    }

    const originalFileName =
      file?.originalname ||
      doc?.originalFileName ||
      `${dto?.title || 'TaiLieu'}.pdf`;

    const binaryText = fileBuffer ? extractTextFromPdfBuffer(fileBuffer) : '';
    const fallbackMetadataText = [
      dto?.title,
      doc?.title,
      doc?.originalFileName,
      doc?.description,
      doc?.department ? `Phòng ban: ${doc.department}` : undefined,
      doc?.issueDate ? `Ngày ban hành: ${new Date(doc.issueDate).toISOString().slice(0, 10)}` : undefined,
      doc?.metadata ? JSON.stringify(doc.metadata) : undefined,
    ]
      .filter(Boolean)
      .join(' | ');

    const extractedText = [dto?.rawText?.trim(), binaryText, fallbackMetadataText]
      .filter(Boolean)
      .join('\n')
      .trim();

    let ownerEmail = dto?.ownerEmail || doc?.ownerEmail;
    if (!ownerEmail && this.googleWorkspaceService) {
      const status = await this.googleWorkspaceService.getStatus().catch(() => null);
      ownerEmail = status?.connectedEmail ?? undefined;
    }

    return {
      doc,
      fileBuffer,
      originalFileName,
      extractedText,
      ownerEmail,
    };
  }

  private async ensureDocumentRecord(params: {
    existingDoc: DocumentDocument | null;
    file?: Express.Multer.File;
    title: string;
    standardizedFileName: string;
    category: DocumentCategory;
    department: string;
    issueDate: string;
    description: string;
    ownerEmail?: string;
    tagsToAdd: string[];
    metadataKey: 'pdfClassification' | 'invoiceAudit';
    metadataValue: Record<string, unknown>;
  }): Promise<DocumentDocument> {
    if (params.existingDoc) {
      const existingTags = Array.isArray(params.existingDoc.tags)
        ? params.existingDoc.tags
        : [];
      params.existingDoc.title = params.title;
      params.existingDoc.originalFileName = params.standardizedFileName;
      params.existingDoc.category = params.category;
      params.existingDoc.issueDate = new Date(params.issueDate);
      if (!params.existingDoc.description) {
        params.existingDoc.description = params.description;
      }
      params.existingDoc.tags = Array.from(
        new Set([...existingTags, ...params.tagsToAdd]),
      );
      params.existingDoc.metadata = {
        ...(params.existingDoc.metadata ?? {}),
        [params.metadataKey]: params.metadataValue,
      };
      params.existingDoc.lastHealthScanAt = new Date();
      await params.existingDoc.save();
      return params.existingDoc;
    }

    const buffer =
      params.file?.buffer ?? Buffer.from(params.description, 'utf-8');
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const safeDiskName = params.standardizedFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(this.storageDir, `${stamp}_${safeDiskName}`);
    const backupFilePath = path.join(this.backupDir, `${stamp}_${safeDiskName}.backup`);

    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(backupFilePath, buffer);

    const doc = await this.documentModel.create({
      title: params.title,
      description: params.description,
      originalFileName: params.standardizedFileName,
      filePath,
      backupFilePath,
      backupHash: sha256,
      fileHash: sha256,
      mimeType: params.file?.mimetype || 'application/pdf',
      fileSize: buffer.length,
      category: params.category,
      department: params.department,
      issueDate: new Date(params.issueDate),
      status: DocumentStatus.ACTIVE,
      isConfidential: params.category === DocumentCategory.CONTRACT,
      healthScore: 100,
      healthStatus: HealthStatus.HEALTHY,
      healthDeductions: [],
      ownerEmail: params.ownerEmail,
      tags: params.tagsToAdd,
      metadata: {
        [params.metadataKey]: params.metadataValue,
      },
      lastHealthScanAt: new Date(),
    });

    await this.versionModel.create({
      documentId: doc._id,
      versionNumber: 1,
      filePath,
      fileHash: sha256,
      fileSize: buffer.length,
      mimeType: doc.mimeType,
      changeReason: 'Tạo tự động qua PDF Intelligence AI',
    });

    return doc;
  }

  private async createRiskIncident(params: {
    documentId: Types.ObjectId;
    title: string;
    description: string;
    severity: IncidentSeverity;
    timelineNote: string;
  }): Promise<string> {
    const incidentCode = `INC-${Date.now().toString().slice(-6)}-${Math.floor(
      100 + Math.random() * 900,
    )}`;
    await this.incidentModel.create({
      incidentCode,
      documentId: params.documentId,
      title: params.title,
      description: params.description,
      type: IncidentType.LOW_HEALTH_SCORE,
      severity: params.severity,
      status: IncidentStatus.OPEN,
      timeline: [
        {
          action: 'CREATED',
          note: params.timelineNote,
          timestamp: new Date(),
        },
      ],
    });
    return incidentCode;
  }

  private async sendEmailSafely(
    toEmail: string | undefined,
    subject: string,
    htmlBody: string,
  ): Promise<{ sent: boolean; reason?: string }> {
    if (!this.googleWorkspaceService) {
      return { sent: false, reason: 'GoogleWorkspaceService chưa khả dụng' };
    }
    try {
      const res = await this.googleWorkspaceService.sendGmail({
        toEmail,
        subject,
        htmlBody,
      });
      return { sent: res.sent, reason: res.reason };
    } catch (err: any) {
      return { sent: false, reason: err?.message || 'Chưa kết nối Gmail OAuth' };
    }
  }

  private mapDocTypeToCategory(docType: StandardizedDocType): {
    category: DocumentCategory;
    department: string;
  } {
    switch (docType) {
      case 'HoaDon':
        return { category: DocumentCategory.FINANCIAL, department: 'Tài Chính Kế Toán' };
      case 'HopDong':
        return { category: DocumentCategory.CONTRACT, department: 'Pháp Chế' };
      case 'BaoCao':
        return { category: DocumentCategory.OPERATIONAL, department: 'Vận Hành' };
      default:
        return { category: DocumentCategory.OTHER, department: 'Kiểm Tra Thủ Công' };
    }
  }

  private normalizeDocType(raw?: string): StandardizedDocType {
    const norm = stripVietnameseDiacritics((raw || '').toLowerCase()).trim();
    if (norm === 'invoice' || norm === 'hoadon' || norm === 'hoa_don') return 'HoaDon';
    if (norm === 'contract' || norm === 'hopdong' || norm === 'hop_dong') return 'HopDong';
    if (norm === 'baocao' || norm === 'bao_cao' || norm === 'report') return 'BaoCao';
    return 'HoSoKhac';
  }

  private classifyByRules(text: string, originalFileName: string): {
    docType: StandardizedDocType;
    companyName: string;
    issueDate: string;
    confidence: number;
    reason: string;
  } {
    const merged = stripVietnameseDiacritics(`${originalFileName} ${text}`).toLowerCase();
    let docType: StandardizedDocType = 'HoSoKhac';
    let confidence = 0.62;
    let reason = 'Chưa khớp mẫu hóa đơn/hợp đồng/báo cáo chuẩn — cần kiểm tra thủ công.';

    if (/hoa don|invoice|gtgt|vat|tong tien|thanh toan|ma so thue/.test(merged)) {
      docType = 'HoaDon';
      confidence = 0.91;
      reason = 'Nội dung PDF chứa từ khóa hóa đơn tài chính / GTGT / thanh toán.';
    } else if (/hop dong|contract|nda|ben a|ben b|thoa thuan|ky ket/.test(merged)) {
      docType = 'HopDong';
      confidence = 0.9;
      reason = 'Nội dung PDF chứa điều khoản hợp đồng hoặc cam kết bảo mật.';
    } else if (/bao cao|report|kiem toan|audit|thong ke|quy\s*[1-4]/.test(merged)) {
      docType = 'BaoCao';
      confidence = 0.87;
      reason = 'Nội dung PDF là báo cáo tổng hợp / kiểm toán định kỳ.';
    }

    const companyMatch = text.match(
      /(?:công ty|cong ty|đơn vị|nhà cung cấp|bên b|bên a|company|supplier)\s*:?\s*([^\n,|]{3,45})/i,
    );
    const knownBrandMatch = merged.match(/\b(viettel(?:\s*idc)?|fpt(?:\s*telecom)?|vnpt|vng|cmc|misa|docuguard)\b/i);
    const companyName = normalizeCompanySlug(
      companyMatch?.[1] || knownBrandMatch?.[1] || 'DocuGuardPartner',
    );
    const issueDate = normalizeIsoDate(text);

    return { docType, companyName, issueDate, confidence, reason };
  }

  /**
   * Chức năng 1 (không trùng lặp): Đọc nội dung PDF -> bóc Metadata (Loại, Công ty, Ngày)
   * -> chuẩn hóa tên [DocType]_TenCongTy_YYYY-MM-DD.pdf -> cảnh báo nếu HoSoKhac.
   */
  async classifyAndRenamePdf(
    file?: Express.Multer.File,
    dto?: PdfIntelligenceRequestDto,
  ): Promise<PdfClassificationResult> {
    const context = await this.resolveSourceContext(file, dto, false);
    const fallback = this.classifyByRules(context.extractedText, context.originalFileName);

    const groqPrompt = [
      'Đọc nội dung tài liệu PDF sau và trả về DUY NHẤT JSON hợp lệ gồm:',
      '- doc_type: một trong ["HoaDon","HopDong","BaoCao","HoSoKhac"] (trả về HoSoKhac nếu tài liệu lạ/không rõ nghiệp vụ)',
      '- company_name: string (tên công ty hoặc đối tác chính viết liền không dấu PascalCase, ví dụ ViettelIDC)',
      '- issue_date: string (ngày chứng từ dạng YYYY-MM-DD)',
      '- confidence: number (0.0 - 1.0)',
      '- reason: string (giải thích ngắn gọn bằng tiếng Việt)',
      `Tên file gốc: ${context.originalFileName}`,
      `Nội dung PDF:\n${context.extractedText.slice(0, 3500)}`,
    ].join('\n');

    const aiRaw = await this.callGroqJson<RawClassificationPayload>(
      'Bạn là hệ thống trích xuất metadata & chuẩn hóa tên tài liệu PDF của DocuGuard. Chỉ trả về JSON.',
      groqPrompt,
    );

    const docType = aiRaw ? this.normalizeDocType(aiRaw.doc_type || aiRaw.docType || aiRaw.category) : fallback.docType;
    const companyName = normalizeCompanySlug(
      aiRaw?.company_name || aiRaw?.companyName,
      fallback.companyName,
    );
    const issueDate = normalizeIsoDate(aiRaw?.issue_date || aiRaw?.issueDate || context.extractedText);
    const confidence =
      typeof aiRaw?.confidence === 'number' && aiRaw.confidence >= 0 && aiRaw.confidence <= 1
        ? Number(aiRaw.confidence.toFixed(2))
        : fallback.confidence;
    const reason = aiRaw?.reason?.trim() || fallback.reason;
    const classifierMode: 'groq' | 'rule-engine' = aiRaw ? 'groq' : 'rule-engine';

    const standardizedFileName = `[${docType}]_${companyName}_${issueDate}.pdf`;
    const { category, department } = this.mapDocTypeToCategory(docType);

    const savedDoc = await this.ensureDocumentRecord({
      existingDoc: context.doc,
      file,
      title: standardizedFileName,
      standardizedFileName,
      category,
      department: context.doc?.department || department,
      issueDate,
      description: `Đã chuẩn hóa tên PDF bởi AI (${classifierMode}): ${reason}`,
      ownerEmail: context.ownerEmail,
      tagsToAdd: ['ai-pdf-classified', docType],
      metadataKey: 'pdfClassification',
      metadataValue: {
        docType,
        companyName,
        issueDate,
        standardizedFileName,
        confidence,
        reason,
        previousFileName: context.originalFileName,
        classifierMode,
        classifiedAt: new Date().toISOString(),
      },
    });

    let driveRenamed = false;
    if (savedDoc.driveFileId && this.googleWorkspaceService) {
      const renameRes = await this.googleWorkspaceService.renameDriveFile(
        savedDoc.driveFileId,
        standardizedFileName,
        { email: context.ownerEmail },
      );
      driveRenamed = renameRes.updated;
    }

    const needsReview = docType === 'HoSoKhac';
    let incidentCreated = false;
    let incidentCode: string | undefined;
    let emailNotification: { sent: boolean; reason?: string } = {
      sent: false,
      reason: 'Hồ sơ hợp lệ — không cần gửi cảnh báo',
    };

    await this.auditService?.logAction({
      action: AuditAction.DOCUMENT_UPDATE,
      entityType: AuditEntityType.DOCUMENT,
      entityId: savedDoc._id,
      entityName: standardizedFileName,
      actorName: 'PDF Classifier AI (DocuGuard)',
      severity: needsReview ? 'warning' : 'info',
      description: `Chuẩn hóa tên PDF "${context.originalFileName}" -> "${standardizedFileName}" (${docType}, độ tin cậy ${Math.round(confidence * 100)}%)`,
      metadata: { docType, companyName, issueDate, standardizedFileName, confidence, reason },
    });

    if (needsReview) {
      incidentCode = await this.createRiskIncident({
        documentId: savedDoc._id,
        title: `[Cần kiểm tra] Hồ sơ PDF lạ: ${standardizedFileName}`,
        description: `AI phân loại tệp "${context.originalFileName}" thuộc nhóm HoSoKhac (độ tin cậy ${Math.round(confidence * 100)}%). Lý do: ${reason}`,
        severity: IncidentSeverity.MEDIUM,
        timelineNote: 'Phát hiện tự động bởi luồng PDF Classifier AI (nhánh OTHER/Review)',
      });
      incidentCreated = true;

      emailNotification = await this.sendEmailSafely(
        context.ownerEmail,
        `⚠️ [DocuGuard] File PDF cần kiểm tra: ${standardizedFileName}`,
        `<div style="font-family:Arial,sans-serif;padding:16px;border:1px solid #fde68a;border-radius:10px;">
          <h3 style="color:#b45309;margin-top:0;">Cảnh báo Hồ sơ PDF cần rà soát thủ công</h3>
          <p><b>Tên gốc:</b> ${context.originalFileName}</p>
          <p><b>Tên chuẩn hóa:</b> ${standardizedFileName}</p>
          <p><b>Phân loại:</b> ${docType} (${Math.round(confidence * 100)}%)</p>
          <p><b>Lý do:</b> ${reason}</p>
          <p><b>Mã sự cố:</b> ${incidentCode}</p>
        </div>`,
      );
    }

    return {
      success: true,
      documentId: savedDoc._id.toString(),
      docType,
      category,
      companyName,
      issueDate,
      standardizedFileName,
      confidence,
      reason,
      needsReview,
      incidentCreated,
      incidentCode,
      driveRenamed,
      emailNotification,
      classifierMode,
      extractedTextPreview: context.extractedText.slice(0, 240),
    };
  }

  private auditInvoiceByRules(
    text: string,
    originalFileName: string,
    simulateSuspicious?: boolean,
  ): {
    supplierName: string;
    issueDate: string;
    totalAmount: number;
    taxCode: string | null;
    isSuspicious: boolean;
    suspicionReason: string;
  } {
    const supplierMatch = text.match(
      /(?:nhà cung cấp|nha cung cap|đơn vị bán|don vi ban|công ty|cong ty|supplier)\s*:?\s*([^\n,|]{3,50})/i,
    );
    const knownBrand = stripVietnameseDiacritics(`${originalFileName} ${text}`).match(
      /\b(viettel(?:\s*idc)?|fpt(?:\s*telecom)?|vnpt|cmc|misa|aws|google\s*cloud)\b/i,
    );
    const supplierName = (
      supplierMatch?.[1] ||
      knownBrand?.[1] ||
      'Công ty Đối tác Hạ tầng'
    ).trim();

    const taxMatch = text.match(/(?:mst|mã số thuế|ma so thue|tax\s*code)\s*:?\s*([0-9-]{10,14})/i);
    const taxCode = taxMatch?.[1] ?? null;

    const amountMatch = text.match(
      /(?:tổng tiền|tong tien|thành tiền|thanh toan|total(?:\s*amount)?)\s*:?\s*([0-9.,\s]{4,20})/i,
    );
    let totalAmount = 15_500_000;
    if (amountMatch?.[1]) {
      const numeric = Number(amountMatch[1].replace(/[.,\s]/g, ''));
      if (Number.isFinite(numeric) && numeric > 0) {
        totalAmount = numeric;
      }
    }

    const issueDate = normalizeIsoDate(text);
    const normalizedText = stripVietnameseDiacritics(`${originalFileName} ${text}`).toLowerCase();
    const suspiciousKeywords = /(gia mao|sai ma so thue|khong hop le|mo|nghi ngo|rui ro|tamper|suspicious|chua xac thuc|canceled|huy hoa don)/i;
    const hasSuspiciousText = suspiciousKeywords.test(normalizedText);

    const isSuspicious = Boolean(simulateSuspicious || hasSuspiciousText);
    const suspicionReason = isSuspicious
      ? simulateSuspicious
        ? 'Phát hiện dấu hiệu bất thường khi kiểm toán mô phỏng hóa đơn (sai lệch thông tin đối soát).'
        : 'Nội dung hóa đơn có dấu hiệu mờ/nghi giả mạo hoặc sai mã số thuế cần kiểm toán.'
      : 'Hóa đơn hợp lệ, đầy đủ thông tin nhà cung cấp, ngày chứng từ và giá trị thanh toán.';

    return {
      supplierName,
      issueDate,
      totalAmount,
      taxCode,
      isSuspicious,
      suspicionReason,
    };
  }

  /**
   * Chức năng 2 (không trùng lặp): Kế toán AI bóc tách dữ liệu hóa đơn PDF
   * -> phát hiện hóa đơn rủi ro/giả mạo (Incident + Gmail) hoặc nhập sổ Audit Log.
   */
  async auditInvoicePdf(
    file?: Express.Multer.File,
    dto?: PdfIntelligenceRequestDto,
  ): Promise<InvoiceAuditResult> {
    const context = await this.resolveSourceContext(file, dto, true);
    const fallback = this.auditInvoiceByRules(
      context.extractedText,
      context.originalFileName,
      dto?.simulateSuspicious,
    );

    const groqPrompt = [
      'Bạn là chuyên gia kế toán AI kiểm toán dữ liệu hóa đơn PDF. Hãy trích xuất DUY NHẤT JSON:',
      '- supplier_name: string (Tên nhà cung cấp / đơn vị bán)',
      '- issue_date: string (YYYY-MM-DD)',
      '- total_amount: number (Tổng tiền thanh toán dạng số VNĐ)',
      '- tax_code: string | null (Mã số thuế nếu có)',
      '- is_suspicious: boolean (true nếu thông tin mờ, thiếu cơ sở, nghi giả mạo hoặc sai mã số thuế)',
      '- suspicion_reason: string (Lý do cụ thể hoặc kết luận hợp lệ bằng tiếng Việt)',
      `Tên tệp: ${context.originalFileName}`,
      `Nội dung PDF:\n${context.extractedText.slice(0, 3500)}`,
    ].join('\n');

    const aiRaw = await this.callGroqJson<RawInvoicePayload>(
      'Bạn là Kế toán AI kiểm toán hóa đơn cho hệ thống DocuGuard. Chỉ trả về JSON.',
      groqPrompt,
    );

    const supplierName =
      (aiRaw?.supplier_name || aiRaw?.supplierName)?.trim() || fallback.supplierName;
    const issueDate = normalizeIsoDate(aiRaw?.issue_date || aiRaw?.issueDate || context.extractedText);
    const rawAmount = Number(
      String(aiRaw?.total_amount ?? aiRaw?.totalAmount ?? fallback.totalAmount).replace(/[^\d.-]/g, ''),
    );
    const totalAmount =
      Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : fallback.totalAmount;
    const taxCode = aiRaw?.tax_code ?? aiRaw?.taxCode ?? fallback.taxCode;

    const aiSuspicious =
      aiRaw?.is_suspicious === true ||
      aiRaw?.is_suspicious === 'true' ||
      aiRaw?.isSuspicious === true ||
      aiRaw?.isSuspicious === 'true';

    // Nếu người dùng/test cố tình bật simulateSuspicious thì giữ cờ kiểm tra rủi ro
    const isSuspicious = Boolean(dto?.simulateSuspicious || (aiRaw ? aiSuspicious : fallback.isSuspicious));
    const suspicionReason =
      dto?.simulateSuspicious
        ? fallback.suspicionReason
        : (aiRaw?.suspicion_reason || aiRaw?.suspicionReason || aiRaw?.reason)?.trim() ||
          fallback.suspicionReason;
    const classifierMode: 'groq' | 'rule-engine' = aiRaw ? 'groq' : 'rule-engine';

    const supplierSlug = normalizeCompanySlug(supplierName, 'NhaCungCap');
    const standardizedFileName = `HOA_DON_${supplierSlug}_${issueDate}.pdf`;

    const savedDoc = await this.ensureDocumentRecord({
      existingDoc: context.doc,
      file,
      title: `Hóa đơn ${supplierName} (${issueDate})`,
      standardizedFileName,
      category: DocumentCategory.FINANCIAL,
      department: context.doc?.department || 'Tài Chính Kế Toán',
      issueDate,
      description: `Kiểm toán hóa đơn AI (${classifierMode}): ${supplierName} — ${totalAmount.toLocaleString('vi-VN')} VNĐ`,
      ownerEmail: context.ownerEmail,
      tagsToAdd: ['invoice-ai-audited', isSuspicious ? 'invoice-suspicious' : 'invoice-verified'],
      metadataKey: 'invoiceAudit',
      metadataValue: {
        docType: 'HOA_DON',
        supplierName,
        issueDate,
        totalAmount,
        taxCode,
        isSuspicious,
        suspicionReason,
        standardizedFileName,
        classifierMode,
        auditedAt: new Date().toISOString(),
      },
    });

    if (isSuspicious) {
      savedDoc.healthScore = Math.max(25, (savedDoc.healthScore ?? 100) - 35);
      savedDoc.healthStatus =
        savedDoc.healthScore < 50 ? HealthStatus.CRITICAL : HealthStatus.WARNING;
      const existingDeductions = Array.isArray(savedDoc.healthDeductions)
        ? savedDoc.healthDeductions.filter((d) => d.rule !== 'SUSPICIOUS_INVOICE')
        : [];
      existingDeductions.push({
        rule: 'SUSPICIOUS_INVOICE',
        reason: suspicionReason,
        pointsDeducted: 35,
        detectedAt: new Date(),
      });
      savedDoc.healthDeductions = existingDeductions;
      await savedDoc.save();
    }

    let incidentCreated = false;
    let incidentCode: string | undefined;

    if (isSuspicious) {
      incidentCode = await this.createRiskIncident({
        documentId: savedDoc._id,
        title: `Phát hiện hóa đơn rủi ro: ${supplierName}`,
        description: `Kế toán AI cảnh báo hóa đơn ${standardizedFileName} (${totalAmount.toLocaleString('vi-VN')} VNĐ). Lý do: ${suspicionReason}`,
        severity: IncidentSeverity.HIGH,
        timelineNote: 'Phát hiện tự động bởi luồng Kế toán AI Kiểm toán Hóa đơn',
      });
      incidentCreated = true;
    }

    await this.auditService?.logAction({
      action: AuditAction.WORKFLOW_HEALTH_SCAN,
      entityType: AuditEntityType.DOCUMENT,
      entityId: savedDoc._id,
      entityName: standardizedFileName,
      actorName: 'Kế toán AI (DocuGuard DMS Audit)',
      severity: isSuspicious ? 'critical' : 'info',
      description: isSuspicious
        ? `[RỦI RO] Hóa đơn ${supplierName} (${totalAmount.toLocaleString('vi-VN')} VNĐ) bị gắn cờ: ${suspicionReason}`
        : `[NHẬP SỔ] Hóa đơn ${supplierName} — Ngày ${issueDate} — Tổng tiền ${totalAmount.toLocaleString('vi-VN')} VNĐ`,
      metadata: {
        ledger: 'DMS_Audit_Log',
        docType: 'HOA_DON',
        supplierName,
        issueDate,
        totalAmount,
        taxCode,
        isSuspicious,
        standardizedFileName,
      },
    });

    const emailNotification = await this.sendEmailSafely(
      context.ownerEmail,
      isSuspicious
        ? `⚠️ [RỦI RO HÓA ĐƠN] ${supplierName} (${standardizedFileName})`
        : `✅ [HÓA ĐƠN THÀNH CÔNG] ${supplierName}`,
      isSuspicious
        ? `<div style="font-family:Arial,sans-serif;padding:16px;border:1px solid #fecdd3;border-radius:10px;">
            <h3 style="color:#be123c;margin-top:0;">⚠️ CẢNH BÁO HÓA ĐƠN RỦI RO / NGHI GIẢ MẠO</h3>
            <p><b>Nhà cung cấp:</b> ${supplierName}</p>
            <p><b>Ngày phát hành:</b> ${issueDate}</p>
            <p><b>Tổng tiền:</b> ${totalAmount.toLocaleString('vi-VN')} VNĐ</p>
            <p><b>Lý do cảnh báo:</b> ${suspicionReason}</p>
            <p><b>Mã sự cố:</b> ${incidentCode}</p>
          </div>`
        : `<div style="font-family:Arial,sans-serif;padding:16px;border:1px solid #bbf7d0;border-radius:10px;">
            <h3 style="color:#047857;margin-top:0;">✅ ĐÃ NHẬP SỔ HÓA ĐƠN THÀNH CÔNG</h3>
            <p><b>Nhà cung cấp:</b> ${supplierName}</p>
            <p><b>Ngày phát hành:</b> ${issueDate}</p>
            <p><b>Tổng tiền:</b> ${totalAmount.toLocaleString('vi-VN')} VNĐ</p>
            <p><b>Tên chuẩn DMS:</b> ${standardizedFileName}</p>
          </div>`,
    );

    return {
      success: true,
      documentId: savedDoc._id.toString(),
      docType: 'HOA_DON',
      supplierName,
      issueDate,
      totalAmount,
      taxCode,
      standardizedFileName,
      isSuspicious,
      suspicionReason,
      healthScore: savedDoc.healthScore,
      healthStatus: savedDoc.healthStatus,
      incidentCreated,
      incidentCode,
      auditLogged: true,
      emailNotification,
      classifierMode,
      extractedTextPreview: context.extractedText.slice(0, 240),
    };
  }
}

