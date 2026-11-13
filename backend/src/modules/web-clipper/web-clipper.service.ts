import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { appConfig } from '../../config/app.config.js';
import {
  Document,
  DocumentCategory,
  DocumentDocument,
  DocumentStatus,
  HealthStatus,
  IntegrityStatus,
} from '../../database/schemas/document.schema.js';
import {
  DocumentVersion,
  DocumentVersionDocument,
} from '../../database/schemas/document-version.schema.js';
import { User, UserDocument } from '../../database/schemas/user.schema.js';
import { AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { GoogleWorkspaceService } from '../google/google-workspace.service.js';
import { N8nClient } from '../../integrations/n8n/n8n.client.js';

export interface ClipRequestDto {
  selectedText: string;
  pageTitle?: string;
  sourceUrl?: string;
  sourcePlatform?: 'google' | 'facebook' | 'web';
  userEmail?: string;
  saveToDrive?: boolean;
  notifyGmail?: boolean;
}

export interface AiClipClassification {
  title: string;
  category: DocumentCategory;
  department: string;
  summary: string;
  tags: string[];
  isConfidential: boolean;
  expiresAt?: string | null;
  classifierMode: 'groq' | 'rule-engine';
}

const CATEGORY_DRIVE_FOLDERS: Record<DocumentCategory, string> = {
  [DocumentCategory.CONTRACT]: 'Hop-Dong',
  [DocumentCategory.FINANCIAL]: 'Tai-Chinh',
  [DocumentCategory.LEGAL]: 'Phap-Che',
  [DocumentCategory.HR]: 'Nhan-Su',
  [DocumentCategory.TECHNICAL]: 'Ky-Thuat',
  [DocumentCategory.OPERATIONAL]: 'Van-Hanh',
  [DocumentCategory.OTHER]: 'Tai-Lieu-Ca-Nhan',
};

@Injectable()
export class WebClipperService {
  private readonly logger = new Logger(WebClipperService.name);
  private readonly storageDir: string;
  private readonly backupDir: string;

  constructor(
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    @InjectModel(DocumentVersion.name)
    private readonly versionModel: Model<DocumentVersionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly n8nClient: N8nClient,
    @Optional() private readonly googleService?: GoogleWorkspaceService,
    @Optional() private readonly auditService?: AuditService,
  ) {
    this.storageDir = path.resolve(process.cwd(), appConfig.documentStoragePath);
    this.backupDir = path.resolve(this.storageDir, '..', 'backups');
    fs.mkdirSync(this.storageDir, { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  private detectPlatform(
    sourceUrl?: string,
    explicit?: 'google' | 'facebook' | 'web',
  ): 'google' | 'facebook' | 'web' {
    if (explicit) return explicit;
    const url = (sourceUrl || '').toLowerCase();
    if (url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.watch')) {
      return 'facebook';
    }
    if (url.includes('google.com') || url.includes('docs.google.com')) {
      return 'google';
    }
    return 'web';
  }

  private classifyByRules(
    text: string,
    pageTitle: string | undefined,
    platform: string,
  ): AiClipClassification {
    const lower = `${pageTitle || ''} ${text}`.toLowerCase();

    let category = DocumentCategory.OTHER;
    let department = 'Cá Nhân';

    if (/(hợp đồng|điều khoản|nghiệm thu|nda|contract|ký kết|thanh lý)/i.test(lower)) {
      category = DocumentCategory.CONTRACT;
      department = 'Pháp Chế';
    } else if (/(hóa đơn|thuế|vat|ngân hàng|chuyển khoản|doanh thu|tài chính|báo giá|invoice)/i.test(lower)) {
      category = DocumentCategory.FINANCIAL;
      department = 'Tài Chính Kế Toán';
    } else if (/(nghị định|thông tư|luật|quy định|chính sách|pháp lý|tuân thủ|policy)/i.test(lower)) {
      category = DocumentCategory.LEGAL;
      department = 'Pháp Chế';
    } else if (/(tuyển dụng|nhân sự|ứng viên|lương|bhxh|nghỉ phép|hr|onboarding)/i.test(lower)) {
      category = DocumentCategory.HR;
      department = 'Nhân Sự';
    } else if (/(api|code|docker|server|bảo mật|lỗ hổng|sha-256|database|github|typescript|next\.js)/i.test(lower)) {
      category = DocumentCategory.TECHNICAL;
      department = 'Công Nghệ Thông Tin';
    } else if (/(quy trình|lịch họp|vận hành|kế hoạch|deadline|báo cáo tuần)/i.test(lower)) {
      category = DocumentCategory.OPERATIONAL;
      department = 'Vận Hành';
    }

    const isConfidential = /(cccd|cmnd|mật khẩu|password|secret|token|số tài khoản|bí mật|nội bộ|tối mật|\b0\d{9}\b)/i.test(
      text,
    );

    // Phát hiện ngày hết hạn dạng dd/mm/yyyy hoặc yyyy-mm-dd
    let expiresAt: string | null = null;
    const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
    if (dmyMatch) {
      const day = Number(dmyMatch[1]);
      const month = Number(dmyMatch[2]);
      const year = Number(dmyMatch[3]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        expiresAt = new Date(Date.UTC(year, month - 1, day)).toISOString();
      }
    }

    const cleanFirstLine = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) || pageTitle || 'Ghi chú web';

    const title =
      cleanFirstLine.length > 72
        ? `${cleanFirstLine.slice(0, 69)}...`
        : cleanFirstLine;

    const summary =
      text.length > 220 ? `${text.slice(0, 217).trim()}...` : text.trim();

    const tags = Array.from(
      new Set([
        'web-clipper',
        platform,
        category,
        ...(isConfidential ? ['confidential'] : []),
      ]),
    );

    return {
      title,
      category,
      department,
      summary,
      tags,
      isConfidential,
      expiresAt,
      classifierMode: 'rule-engine',
    };
  }

  async classifyText(
    text: string,
    pageTitle: string | undefined,
    platform: string,
  ): Promise<AiClipClassification> {
    if (!appConfig.groqApiKey) {
      return this.classifyByRules(text, pageTitle, platform);
    }

    try {
      const prompt = [
        'Phân loại đoạn dữ liệu người dùng vừa chọn khi lướt web (Google/Facebook) và trả về DUY NHẤT JSON hợp lệ với các trường:',
        '- title: string (tiêu đề tiếng Việt ngắn gọn <= 70 ký tự)',
        '- category: một trong ["contract","financial","legal","hr","technical","operational","other"]',
        '- department: string (ví dụ "Pháp Chế", "Tài Chính Kế Toán", "Công Nghệ Thông Tin", "Nhân Sự", "Vận Hành", "Cá Nhân")',
        '- summary: string (tóm tắt ngắn gọn bằng tiếng Việt 1-2 câu)',
        '- tags: string[] (3-5 tag ngắn không dấu hoặc kebab-case)',
        '- isConfidential: boolean (true nếu có CCCD, tài khoản, mật khẩu, dữ liệu mật)',
        '- expiresAt: string | null (ISO date nếu có ngày hết hạn/deadline, ngược lại null)',
        `Tiêu đề trang: ${pageTitle || 'Không rõ'}`,
        `Nền tảng: ${platform}`,
        `Nội dung được chọn:\n${text.slice(0, 3000)}`,
      ].join('\n');

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appConfig.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: appConfig.groqModel,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Bạn là trợ lý phân loại tài liệu tiếng Việt cho hệ thống bảo mật DocuGuard. Chỉ trả về JSON.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        return this.classifyByRules(text, pageTitle, platform);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) {
        return this.classifyByRules(text, pageTitle, platform);
      }

      const parsed = JSON.parse(rawContent) as Partial<AiClipClassification>;
      const validCat = Object.values(DocumentCategory).includes(
        parsed.category as DocumentCategory,
      )
        ? (parsed.category as DocumentCategory)
        : DocumentCategory.OTHER;

      return {
        title: parsed.title || pageTitle || 'Ghi chú từ Web Clipper',
        category: validCat,
        department: parsed.department || 'Cá Nhân',
        summary: parsed.summary || text.slice(0, 200),
        tags: Array.from(
          new Set([
            'web-clipper',
            platform,
            ...(Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : []),
          ]),
        ),
        isConfidential: Boolean(parsed.isConfidential),
        expiresAt: parsed.expiresAt || null,
        classifierMode: 'groq',
      };
    } catch (err: any) {
      this.logger.warn(`Groq AI fallback sang rule-engine: ${err?.message}`);
      return this.classifyByRules(text, pageTitle, platform);
    }
  }

  async clipAndSave(dto: ClipRequestDto) {
    if (!dto.selectedText || dto.selectedText.trim().length < 3) {
      throw new BadRequestException('Đoạn dữ liệu được chọn quá ngắn hoặc trống.');
    }

    const platform = this.detectPlatform(dto.sourceUrl, dto.sourcePlatform);
    const aiResult = await this.classifyText(dto.selectedText, dto.pageTitle, platform);

    const ownerUser = dto.userEmail
      ? await this.userModel.findOne({ email: dto.userEmail.toLowerCase().trim() }).exec()
      : null;

    const ownerEmail = ownerUser?.email || dto.userEmail?.toLowerCase().trim() || 'admin@docuguard.io';
    const clippedAt = new Date();

    const markdownContent = [
      `# ${aiResult.title}`,
      '',
      `- **Nguồn**: ${dto.sourceUrl || 'Trình duyệt web'} (${platform.toUpperCase()})`,
      `- **Trang**: ${dto.pageTitle || 'Không rõ'}`,
      `- **Chủ sở hữu**: ${ownerEmail}`,
      `- **Phân loại AI (${aiResult.classifierMode})**: ${aiResult.category} — ${aiResult.department}`,
      `- **Tags**: ${aiResult.tags.map((t) => `#${t}`).join(' ')}`,
      `- **Độ nhạy cảm**: ${aiResult.isConfidential ? 'Tối mật' : 'Tiêu chuẩn'}`,
      ...(aiResult.expiresAt ? [`- **Hạn mốc phát hiện**: ${aiResult.expiresAt}`] : []),
      `- **Thời gian trích xuất**: ${clippedAt.toISOString()}`,
      '',
      '## Tóm tắt AI',
      aiResult.summary,
      '',
      '## Nội dung gốc đã chọn',
      dto.selectedText.trim(),
      '',
    ].join('\n');

    const buffer = Buffer.from(markdownContent, 'utf-8');
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const slug = aiResult.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'web_clip';

    const fileName = `${slug}.md`;
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const filePath = path.resolve(this.storageDir, `${stamp}-${fileName}`);
    const backupFilePath = path.resolve(this.backupDir, `${stamp}-${fileName}.backup`);

    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(backupFilePath, buffer);

    let driveUploadResult: { id: string; webViewLink?: string } | null = null;
    if (dto.saveToDrive !== false && this.googleService) {
      driveUploadResult = await this.googleService
        .uploadFileToDrive({
          email: ownerEmail,
          userId: ownerUser?._id.toString(),
          fileName,
          contentBuffer: buffer,
          mimeType: 'text/markdown',
          categoryFolder: CATEGORY_DRIVE_FOLDERS[aiResult.category],
        })
        .catch(() => null);
    }

    const doc = await this.documentModel.create({
      title: aiResult.title,
      description: aiResult.summary,
      originalFileName: fileName,
      filePath,
      backupFilePath,
      backupHash: fileHash,
      fileHash,
      mimeType: 'text/markdown',
      fileSize: buffer.length,
      category: aiResult.category,
      department: aiResult.department,
      issueDate: clippedAt,
      expiresAt: aiResult.expiresAt ? new Date(aiResult.expiresAt) : undefined,
      status: DocumentStatus.ACTIVE,
      isConfidential: aiResult.isConfidential,
      healthScore: 100,
      healthStatus: HealthStatus.HEALTHY,
      integrityStatus: IntegrityStatus.INTACT,
      lastIntegrityCheckAt: clippedAt,
      lastHealthScanAt: clippedAt,
      uploadedBy: ownerUser?._id,
      ownerEmail,
      driveFileId: driveUploadResult?.id,
      tags: aiResult.tags,
      metadata: {
        clippedFromBrowser: true,
        sourceUrl: dto.sourceUrl,
        sourcePlatform: platform,
        pageTitle: dto.pageTitle,
        aiSummary: aiResult.summary,
        classifierMode: aiResult.classifierMode,
        driveWebViewLink: driveUploadResult?.webViewLink,
      },
    });

    await this.versionModel.create({
      documentId: doc._id,
      versionNumber: 1,
      filePath,
      fileHash,
      fileSize: buffer.length,
      mimeType: 'text/markdown',
      changeReason: `Lưu từ Smart Web Clipper (${platform})`,
      uploadedBy: ownerUser?._id,
    });

    let gmailNotified = false;
    const shouldNotifyGmail =
      Boolean(dto.notifyGmail) || aiResult.isConfidential || Boolean(aiResult.expiresAt);

    if (shouldNotifyGmail && this.googleService) {
      const mailRes = await this.googleService
        .sendGmail({
          toEmail: ownerEmail,
          subject: `[DocuGuard Clipper] Đã phân loại & lưu: ${aiResult.title}`,
          htmlBody: `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
              <h2 style="color:#0284c7;margin-top:0;">Đã lưu dữ liệu từ ${platform.toUpperCase()}</h2>
              <p><b>Tiêu đề:</b> ${aiResult.title}</p>
              <p><b>Danh mục AI:</b> ${aiResult.category} (${aiResult.department})</p>
              <p><b>Tóm tắt:</b> ${aiResult.summary}</p>
              ${aiResult.expiresAt ? `<p><b>Hạn mốc phát hiện:</b> ${aiResult.expiresAt}</p>` : ''}
              <p><b>Nguồn:</b> <a href="${dto.sourceUrl || '#'}">${dto.sourceUrl || 'Web'}</a></p>
              <p><b>SHA-256:</b> <code>${fileHash}</code></p>
              ${driveUploadResult?.webViewLink ? `<p><a href="${driveUploadResult.webViewLink}">Mở tệp trên Google Drive</a></p>` : ''}
            </div>
          `,
        })
        .catch(() => ({ sent: false }));
      gmailNotified = Boolean(mailRes?.sent);
    }

    await this.auditService?.logAction({
      action: AuditAction.DOCUMENT_UPLOAD,
      entityType: AuditEntityType.DOCUMENT,
      entityId: doc._id,
      entityName: doc.title,
      actorId: ownerUser?._id,
      actorName: ownerUser?.fullName || ownerEmail,
      actorEmail: ownerEmail,
      severity: aiResult.isConfidential ? 'warning' : 'info',
      description: `Smart Web Clipper (${platform}) phân loại [${aiResult.category}] & lưu "${doc.title}"`,
    });

    this.n8nClient
      .triggerWebClipper({
        documentId: doc._id.toString(),
        title: doc.title,
        category: aiResult.category,
        department: aiResult.department,
        platform,
        sourceUrl: dto.sourceUrl,
        ownerEmail,
        driveSynced: Boolean(driveUploadResult),
      })
      .catch(() => undefined);

    return {
      document: doc,
      classification: aiResult,
      driveSynced: Boolean(driveUploadResult),
      driveWebViewLink: driveUploadResult?.webViewLink,
      gmailNotified,
    };
  }

  async getClippedHistory(email?: string) {
    const query: Record<string, unknown> = {
      status: { $ne: DocumentStatus.DELETED },
      'metadata.clippedFromBrowser': true,
    };
    if (email && email.trim()) {
      query.ownerEmail = email.toLowerCase().trim();
    }

    return this.documentModel.find(query).sort({ createdAt: -1 }).limit(100).exec();
  }
}

