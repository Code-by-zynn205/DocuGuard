import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { appConfig } from '../../config/app.config.js';
import { User, UserDocument } from '../../database/schemas/user.schema.js';
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
import {
  Incident,
  IncidentDocument,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '../../database/schemas/incident.schema.js';
import { AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { N8nClient } from '../../integrations/n8n/n8n.client.js';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  lastModifyingUser?: { displayName?: string; emailAddress?: string };
}

@Injectable()
export class GoogleWorkspaceService {
  private readonly logger = new Logger(GoogleWorkspaceService.name);
  private readonly storageDir: string;
  private readonly backupDir: string;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Document.name) private readonly documentModel: Model<DocumentDocument>,
    @InjectModel(DocumentVersion.name)
    private readonly versionModel: Model<DocumentVersionDocument>,
    @InjectModel(Incident.name) private readonly incidentModel: Model<IncidentDocument>,
    private readonly n8nClient: N8nClient,
    @Optional() private readonly auditService?: AuditService,
  ) {
    this.storageDir = path.resolve(process.cwd(), appConfig.documentStoragePath);
    this.backupDir = path.resolve(this.storageDir, '..', 'backups');
    fs.mkdirSync(this.storageDir, { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  private async resolveGoogleUser(identifier?: { userId?: string; email?: string }): Promise<UserDocument | null> {
    if (identifier?.userId && Types.ObjectId.isValid(identifier.userId)) {
      const byId = await this.userModel.findById(identifier.userId).exec();
      if (byId && (byId.googleAccessToken || byId.googleRefreshToken)) {
        return byId;
      }
    }

    if (identifier?.email) {
      const byEmail = await this.userModel
        .findOne({ email: identifier.email.toLowerCase().trim() })
        .exec();
      if (byEmail && (byEmail.googleAccessToken || byEmail.googleRefreshToken)) {
        return byEmail;
      }
    }

    return this.userModel
      .findOne({
        $or: [
          { googleRefreshToken: { $exists: true, $ne: '' } },
          { googleAccessToken: { $exists: true, $ne: '' } },
        ],
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  private async getValidAccessToken(user: UserDocument): Promise<string> {
    const expiresAt = user.googleTokenExpiresAt ? new Date(user.googleTokenExpiresAt).getTime() : 0;
    const isExpired = !expiresAt || expiresAt <= Date.now() + 60_000;

    if (!isExpired && user.googleAccessToken) {
      return user.googleAccessToken;
    }

    if (user.googleRefreshToken && appConfig.googleClientId && appConfig.googleClientSecret) {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: appConfig.googleClientId,
          client_secret: appConfig.googleClientSecret,
          refresh_token: user.googleRefreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { access_token: string; expires_in?: number };
        user.googleAccessToken = data.access_token;
        user.googleTokenExpiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
        await user.save();
        return data.access_token;
      }
    }

    if (user.googleAccessToken) {
      return user.googleAccessToken;
    }

    throw new BadRequestException('Phiên kết nối Google đã hết hạn. Vui lòng đăng nhập lại bằng Google.');
  }

  async getStatus(identifier?: { userId?: string; email?: string }) {
    const googleConfigured = Boolean(appConfig.googleClientId && appConfig.googleClientSecret);
    const user = await this.resolveGoogleUser(identifier);

    const driveDocsCount = await this.documentModel.countDocuments({
      status: { $ne: DocumentStatus.DELETED },
      driveFileId: { $exists: true, $nin: ['', null] },
    });

    return {
      googleConfigured,
      connected: Boolean(user),
      connectedEmail: user?.email ?? null,
      connectedName: user?.fullName ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      driveSyncedAt: user?.driveSyncedAt ? user.driveSyncedAt.toISOString() : null,
      syncedDocumentsCount: driveDocsCount,
    };
  }

  async listDriveFiles(identifier?: { userId?: string; email?: string }): Promise<DriveFileItem[]> {
    const user = await this.resolveGoogleUser(identifier);
    if (!user) {
      return [];
    }

    const accessToken = await this.getValidAccessToken(user);
    const params = new URLSearchParams({
      pageSize: '25',
      orderBy: 'modifiedTime desc',
      q: "trashed = false and mimeType != 'application/vnd.google-apps.folder'",
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,lastModifyingUser)',
    });

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.warn(`Google Drive API lỗi (${res.status}): ${errText}`);
      throw new BadRequestException('Không thể đọc danh sách tệp từ Google Drive.');
    }

    const data = (await res.json()) as { files?: DriveFileItem[] };
    return data.files ?? [];
  }

  private async downloadDriveFile(
    accessToken: string,
    file: DriveFileItem,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const isGoogleDoc = file.mimeType.startsWith('application/vnd.google-apps.');
    const exportMime = file.mimeType === 'application/vnd.google-apps.spreadsheet'
      ? 'text/csv'
      : 'text/plain';

    const url = isGoogleDoc
      ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(exportMime)}`
      : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`Không tải được tệp Drive "${file.name}" (${res.status})`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const ext = isGoogleDoc ? (exportMime === 'text/csv' ? '.csv' : '.txt') : '';
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: isGoogleDoc ? exportMime : file.mimeType,
      fileName: ext && !file.name.endsWith(ext) ? `${file.name}${ext}` : file.name,
    };
  }

  private inferCategoryFromName(name: string): DocumentCategory {
    const lower = name.toLowerCase();
    if (lower.includes('hop dong') || lower.includes('contract') || lower.includes('nda')) {
      return DocumentCategory.CONTRACT;
    }
    if (lower.includes('hoa don') || lower.includes('invoice') || lower.includes('tai chinh') || lower.includes('bao cao')) {
      return DocumentCategory.FINANCIAL;
    }
    if (lower.includes('luat') || lower.includes('phap') || lower.includes('chinh sach') || lower.includes('policy')) {
      return DocumentCategory.LEGAL;
    }
    if (lower.includes('nhan su') || lower.includes('hr') || lower.includes('cv')) {
      return DocumentCategory.HR;
    }
    if (lower.includes('ky thuat') || lower.includes('api') || lower.includes('spec')) {
      return DocumentCategory.TECHNICAL;
    }
    return DocumentCategory.OPERATIONAL;
  }

  private shouldSkipDriveFile(file: DriveFileItem): boolean {
    const unsupportedTypes = new Set([
      'application/vnd.google-apps.shortcut',
      'application/vnd.google-apps.form',
      'application/vnd.google-apps.map',
      'application/vnd.google-apps.site',
      'application/vnd.google-apps.jam',
    ]);
    if (unsupportedTypes.has(file.mimeType)) {
      return true;
    }
    const maxBytes = 15 * 1024 * 1024;
    if (file.size && Number(file.size) > maxBytes) {
      this.logger.warn(`Bỏ qua tệp Drive quá lớn (>15MB): "${file.name}"`);
      return true;
    }
    return false;
  }

  private async syncSingleDriveFile(
    accessToken: string,
    user: UserDocument,
    file: DriveFileItem,
  ): Promise<{
    outcome: 'created' | 'verified' | 'tampered' | 'skipped';
    tamperedDoc?: { title: string; expectedHash: string; actualHash: string };
  }> {
    if (this.shouldSkipDriveFile(file)) {
      return { outcome: 'skipped' };
    }

    const { buffer, mimeType, fileName } = await this.downloadDriveFile(accessToken, file);
    const currentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const existing = await this.documentModel
      .findOne({ driveFileId: file.id, status: { $ne: DocumentStatus.DELETED } })
      .exec();

    if (!existing) {
      const safeBase = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const stamp = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const filePath = path.resolve(this.storageDir, `${stamp}-${safeBase}`);
      const backupFilePath = path.resolve(this.backupDir, `${stamp}-${safeBase}.backup`);
      fs.writeFileSync(filePath, buffer);
      fs.writeFileSync(backupFilePath, buffer);

      const doc = await this.documentModel.create({
        title: file.name,
        description: `Đồng bộ tự động từ Google Drive (${user.email})`,
        originalFileName: fileName,
        filePath,
        backupFilePath,
        backupHash: currentHash,
        fileHash: currentHash,
        mimeType,
        fileSize: buffer.length,
        category: this.inferCategoryFromName(file.name),
        department: user.department || 'Google Drive',
        status: DocumentStatus.ACTIVE,
        healthScore: 100,
        healthStatus: HealthStatus.HEALTHY,
        integrityStatus: IntegrityStatus.INTACT,
        lastIntegrityCheckAt: new Date(),
        lastHealthScanAt: new Date(),
        uploadedBy: user._id,
        ownerEmail: user.email,
        driveFileId: file.id,
        tags: ['google-drive', 'synced'],
        metadata: {
          driveFileId: file.id,
          driveWebViewLink: file.webViewLink,
          driveModifiedTime: file.modifiedTime,
          lastModifyingUser: file.lastModifyingUser?.emailAddress,
        },
      });

      await this.versionModel.create({
        documentId: doc._id,
        versionNumber: 1,
        filePath,
        fileHash: currentHash,
        fileSize: buffer.length,
        mimeType,
        changeReason: 'Đồng bộ khởi tạo từ Google Drive',
        uploadedBy: user._id,
      });

      return { outcome: 'created' };
    }

    if (currentHash !== existing.fileHash) {
      existing.integrityStatus = IntegrityStatus.TAMPERED;
      existing.healthScore = 35;
      existing.healthStatus = HealthStatus.CRITICAL;
      existing.healthDeductions.push({
        rule: 'INTEGRITY_TAMPERED',
        reason: `Nội dung tệp trên Google Drive đã thay đổi ngoài luồng (người sửa: ${file.lastModifyingUser?.emailAddress || 'không rõ'})`,
        pointsDeducted: 65,
        detectedAt: new Date(),
      });
      existing.lastIntegrityCheckAt = new Date();
      await existing.save();

      const incidentCode = `INC-${Date.now().toString().slice(-6)}`;
      await this.incidentModel.create({
        incidentCode,
        documentId: existing._id,
        title: `Phát hiện sửa đổi trên Google Drive: ${existing.title}`,
        severity: IncidentSeverity.CRITICAL,
        type: IncidentType.INTEGRITY_VIOLATION,
        status: IncidentStatus.OPEN,
        description: `Hash trên Google Drive (${currentHash.slice(0, 16)}...) khác với bản niêm phong (${existing.fileHash.slice(0, 16)}...). Người sửa cuối: ${file.lastModifyingUser?.emailAddress || 'N/A'}`,
        timeline: [
          {
            action: 'CREATED',
            note: 'Phát hiện sai lệch SHA-256 khi đồng bộ Google Drive',
            timestamp: new Date(),
          },
        ],
      });

      this.n8nClient
        .triggerIncidentWorkflow({
          documentId: existing._id.toString(),
          title: existing.title,
          expectedHash: existing.fileHash,
          actualHash: currentHash,
          source: 'google_drive_sync',
          ownerEmail: user.email,
        })
        .catch(() => undefined);

      return {
        outcome: 'tampered',
        tamperedDoc: {
          title: existing.title,
          expectedHash: existing.fileHash,
          actualHash: currentHash,
        },
      };
    }

    existing.lastIntegrityCheckAt = new Date();
    await existing.save();
    return { outcome: 'verified' };
  }

  async syncUserDrive(identifier?: { userId?: string; email?: string }) {
    const user = await this.resolveGoogleUser(identifier);
    if (!user) {
      throw new BadRequestException(
        'Chưa có tài khoản Gmail nào kết nối Google Drive. Vui lòng đăng nhập bằng Google trước.',
      );
    }

    const accessToken = await this.getValidAccessToken(user);
    const files = await this.listDriveFiles({ userId: user._id.toString() });

    let createdCount = 0;
    let verifiedCount = 0;
    let tamperedCount = 0;
    const tamperedDocs: Array<{ title: string; expectedHash: string; actualHash: string }> = [];

    const BATCH_SIZE = 5;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            return await this.syncSingleDriveFile(accessToken, user, file);
          } catch (err: any) {
            this.logger.warn(`Bỏ qua tệp Drive "${file.name}": ${err?.message}`);
            return { outcome: 'skipped' as const };
          }
        }),
      );

      for (const item of batchResults) {
        if (item.outcome === 'created') createdCount += 1;
        else if (item.outcome === 'verified') verifiedCount += 1;
        else if (item.outcome === 'tampered') {
          tamperedCount += 1;
          if (item.tamperedDoc) tamperedDocs.push(item.tamperedDoc);
        }
      }
    }

    user.driveSyncedAt = new Date();
    await user.save();

    if (tamperedCount > 0) {
      await this.sendGmail({
        toEmail: user.email,
        subject: `[CRITICAL] DocuGuard phát hiện ${tamperedCount} tệp Google Drive bị thay đổi trái phép`,
        htmlBody: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:20px;border:1px solid #fecdd3;border-radius:12px;">
            <h2 style="color:#be123c;margin-top:0;">Cảnh báo toàn vẹn Google Drive</h2>
            <p>Hệ thống <b>DocuGuard</b> vừa quét Google Drive của tài khoản <b>${user.email}</b> và phát hiện thay đổi bất thường:</p>
            <ul>
              ${tamperedDocs
                .map(
                  (d) =>
                    `<li><b>${d.title}</b><br/>Hash gốc: <code>${d.expectedHash.slice(0, 18)}...</code><br/>Hash Drive: <code>${d.actualHash.slice(0, 18)}...</code></li>`,
                )
                .join('')}
            </ul>
            <p><a href="${appConfig.frontendOrigin}/incidents" style="display:inline-block;padding:10px 18px;background:#e11d48;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Mở Trung tâm Sự cố</a></p>
          </div>
        `,
        user,
      }).catch(() => undefined);
    }

    await this.auditService?.logAction({
      action: AuditAction.WORKFLOW_HEALTH_SCAN,
      entityType: AuditEntityType.WORKFLOW,
      entityName: 'Google Drive Sync',
      actorId: user._id,
      actorName: user.fullName,
      actorEmail: user.email,
      severity: tamperedCount > 0 ? 'critical' : 'info',
      description: `Đồng bộ Google Drive (${user.email}): thêm mới ${createdCount}, nguyên vẹn ${verifiedCount}, cảnh báo sai lệch ${tamperedCount}`,
    });

    return {
      email: user.email,
      scannedFiles: files.length,
      createdCount,
      verifiedCount,
      tamperedCount,
      syncedAt: user.driveSyncedAt.toISOString(),
    };
  }

  private async ensureDriveFolder(
    accessToken: string,
    name: string,
    parentId?: string,
  ): Promise<string> {
    const safeName = name.replace(/'/g, "\\'");
    const qParts = [
      `name = '${safeName}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      'trashed = false',
      ...(parentId ? [`'${parentId}' in parents`] : []),
    ];

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qParts.join(' and '))}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (searchRes.ok) {
      const found = (await searchRes.json()) as { files?: Array<{ id: string }> };
      if (found.files?.[0]?.id) {
        return found.files[0].id;
      }
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    });

    if (!createRes.ok) {
      throw new Error('Không tạo được thư mục trên Google Drive');
    }

    const created = (await createRes.json()) as { id: string };
    return created.id;
  }

  async uploadFileToDrive(params: {
    email?: string;
    userId?: string;
    fileName: string;
    contentBuffer: Buffer;
    mimeType: string;
    categoryFolder?: string;
  }): Promise<{ id: string; webViewLink?: string } | null> {
    const user = await this.resolveGoogleUser({ email: params.email, userId: params.userId });
    if (!user) return null;

    const accessToken = await this.getValidAccessToken(user);
    const rootFolderId = await this.ensureDriveFolder(accessToken, 'DocuGuard');
    const targetFolderId = params.categoryFolder
      ? await this.ensureDriveFolder(accessToken, params.categoryFolder, rootFolderId)
      : rootFolderId;

    const boundary = `docuguard_${Date.now()}`;
    const metadataPart = JSON.stringify({
      name: params.fileName,
      parents: [targetFolderId],
    });

    const preamble = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataPart}\r\n--${boundary}\r\nContent-Type: ${params.mimeType}\r\n\r\n`,
      'utf-8',
    );
    const epilogue = Buffer.from(`\r\n--${boundary}--`, 'utf-8');
    const body = Buffer.concat([preamble, params.contentBuffer, epilogue]);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!res.ok) {
      this.logger.warn(`Upload lên Google Drive thất bại (${res.status})`);
      return null;
    }

    return (await res.json()) as { id: string; webViewLink?: string };
  }

  async sendGmail(params: {
    toEmail?: string;
    subject: string;
    htmlBody: string;
    user?: UserDocument;
  }): Promise<{ sent: boolean; messageId?: string; reason?: string }> {
    const user = params.user ?? (await this.resolveGoogleUser({ email: params.toEmail }));
    if (!user) {
      return {
        sent: false,
        reason: 'Chưa có tài khoản Gmail kết nối OAuth trong hệ thống',
      };
    }

    const recipient = params.toEmail || user.email;
    const accessToken = await this.getValidAccessToken(user);
    const encodedSubject = `=?UTF-8?B?${Buffer.from(params.subject, 'utf-8').toString('base64')}?=`;

    const rawMessage = [
      `To: ${recipient}`,
      `From: ${user.email}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      params.htmlBody,
    ].join('\r\n');

    const encodedRaw = Buffer.from(rawMessage, 'utf-8').toString('base64url');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedRaw }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.warn(`Gmail API lỗi (${res.status}): ${errText}`);
      return { sent: false, reason: `Gmail API lỗi ${res.status}` };
    }

    const data = (await res.json()) as { id: string };
    return { sent: true, messageId: data.id };
  }

  async sendRecoveryApprovalEmail(params: {
    toEmail?: string;
    recoveryCode: string;
    documentTitle: string;
    reason: string;
    approvalToken: string;
    backendPublicUrl?: string;
  }) {
    const base = (params.backendPublicUrl || `http://localhost:${appConfig.port}`).replace(/\/+$/, '');
    const approveUrl = `${base}/api/recovery/email-action?token=${encodeURIComponent(params.approvalToken)}&action=approve`;
    const rejectUrl = `${base}/api/recovery/email-action?token=${encodeURIComponent(params.approvalToken)}&action=reject`;

    return this.sendGmail({
      toEmail: params.toEmail,
      subject: `[DocuGuard] Cần phê duyệt khôi phục tài liệu mật: ${params.documentTitle} (${params.recoveryCode})`,
      htmlBody: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
          <h2 style="color:#0f172a;margin-top:0;">Yêu cầu Phê duyệt Khôi phục Tài liệu Mật</h2>
          <p>Mã yêu cầu: <b>${params.recoveryCode}</b></p>
          <p>Tài liệu: <b>${params.documentTitle}</b></p>
          <p>Lý do: ${params.reason}</p>
          <div style="margin:24px 0;">
            <a href="${approveUrl}" style="display:inline-block;padding:12px 20px;background:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;margin-right:12px;">
              ✅ Phê duyệt &amp; Khôi phục ngay
            </a>
            <a href="${rejectUrl}" style="display:inline-block;padding:12px 20px;background:#e11d48;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">
              ❌ Từ chối
            </a>
          </div>
          <p style="font-size:12px;color:#64748b;">Hoặc truy cập bảng điều khiển Safe Recovery tại: <a href="${appConfig.frontendOrigin}/recovery">${appConfig.frontendOrigin}/recovery</a></p>
        </div>
      `,
    });
  }

  /**
   * Tải nội dung file trên Google Drive theo fileId (dùng cho phân tích nội dung PDF).
   */
  async downloadDriveFileById(
    driveFileId: string,
    identifier?: { userId?: string; email?: string },
  ): Promise<Buffer | null> {
    if (!driveFileId) {
      return null;
    }
    try {
      const user = await this.resolveGoogleUser(identifier);
      if (!user) {
        return null;
      }
      const accessToken = await this.getValidAccessToken(user);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!res.ok) {
        return null;
      }
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  /**
   * Đổi tên file trên Google Drive (an toàn, không ném lỗi nếu file nằm ngoài phạm vi drive.file).
   */
  async renameDriveFile(
    driveFileId: string,
    newName: string,
    identifier?: { userId?: string; email?: string },
  ): Promise<{ updated: boolean; reason?: string }> {
    if (!driveFileId || !newName) {
      return { updated: false, reason: 'Thiếu driveFileId hoặc tên mới' };
    }
    try {
      const user = await this.resolveGoogleUser(identifier);
      if (!user) {
        return { updated: false, reason: 'Chưa có tài khoản Google OAuth kết nối' };
      }
      const accessToken = await this.getValidAccessToken(user);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newName }),
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!res.ok) {
        return { updated: false, reason: `Google Drive API trả về ${res.status}` };
      }
      return { updated: true };
    } catch (err: any) {
      return { updated: false, reason: err?.message || 'Lỗi đổi tên trên Drive' };
    }
  }
}

