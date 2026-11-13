import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';
import { AuditService } from '../audit/audit.service.js';

export interface DocuGuardSettingsDto {
  organizationName: string;
  organizationCode: string;
  timezone: string;
  auditRetentionDays: number;
  autoQuarantineRiskThreshold: number;
  require2FA: boolean;
  requireCisoApproval: boolean;
  autoCreateIncidentOnTamper: boolean;
  sessionTimeoutMinutes: number;
  n8nHealthScanWebhook: string;
  n8nIncidentWebhook: string;
}

const DEFAULT_SETTINGS: DocuGuardSettingsDto = {
  organizationName: 'DocuGuard Enterprise Compliance',
  organizationCode: 'DG-VN-ENT',
  timezone: 'Asia/Ho_Chi_Minh (GMT+7)',
  auditRetentionDays: 365,
  autoQuarantineRiskThreshold: 40,
  require2FA: true,
  requireCisoApproval: true,
  autoCreateIncidentOnTamper: true,
  sessionTimeoutMinutes: 30,
  n8nHealthScanWebhook: 'http://localhost:5678/webhook/document-health-scan',
  n8nIncidentWebhook: 'http://localhost:5678/webhook/incident-resolution',
};

const SETTINGS_DOC_ID = 'global_settings';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private get collection() {
    return this.connection.collection('system_settings');
  }

  async getSettings(): Promise<DocuGuardSettingsDto> {
    try {
      const existing = await this.collection.findOne({ _id: SETTINGS_DOC_ID as any });
      if (!existing) {
        await this.collection.updateOne(
          { _id: SETTINGS_DOC_ID as any },
          { $setOnInsert: { ...DEFAULT_SETTINGS, updatedAt: new Date() } },
          { upsert: true },
        );
        return { ...DEFAULT_SETTINGS };
      }

      const { _id, updatedAt, ...rest } = existing as Record<string, any>;
      return {
        ...DEFAULT_SETTINGS,
        ...rest,
      };
    } catch (error: any) {
      this.logger.warn(`Không đọc được system_settings: ${error?.message}`);
      return { ...DEFAULT_SETTINGS };
    }
  }

  async updateSettings(payload: Partial<DocuGuardSettingsDto>): Promise<DocuGuardSettingsDto> {
    const current = await this.getSettings();
    const next: DocuGuardSettingsDto = {
      organizationName: payload.organizationName ?? current.organizationName,
      organizationCode: payload.organizationCode ?? current.organizationCode,
      timezone: payload.timezone ?? current.timezone,
      auditRetentionDays: Number(payload.auditRetentionDays ?? current.auditRetentionDays),
      autoQuarantineRiskThreshold: Number(
        payload.autoQuarantineRiskThreshold ?? current.autoQuarantineRiskThreshold,
      ),
      require2FA:
        typeof payload.require2FA === 'boolean' ? payload.require2FA : current.require2FA,
      requireCisoApproval:
        typeof payload.requireCisoApproval === 'boolean'
          ? payload.requireCisoApproval
          : current.requireCisoApproval,
      autoCreateIncidentOnTamper:
        typeof payload.autoCreateIncidentOnTamper === 'boolean'
          ? payload.autoCreateIncidentOnTamper
          : current.autoCreateIncidentOnTamper,
      sessionTimeoutMinutes: Number(
        payload.sessionTimeoutMinutes ?? current.sessionTimeoutMinutes,
      ),
      n8nHealthScanWebhook: payload.n8nHealthScanWebhook ?? current.n8nHealthScanWebhook,
      n8nIncidentWebhook: payload.n8nIncidentWebhook ?? current.n8nIncidentWebhook,
    };

    await this.collection.updateOne(
      { _id: SETTINGS_DOC_ID as any },
      { $set: { ...next, updatedAt: new Date() } },
      { upsert: true },
    );

    await this.auditService?.logAction({
      action: AuditAction.WORKFLOW_HEALTH_SCAN,
      entityType: AuditEntityType.SYSTEM,
      entityName: 'System Settings',
      actorName: 'Quản trị viên DocuGuard',
      severity: 'info',
      description: `Cập nhật cấu hình hệ thống (${next.organizationName}, ngưỡng cách ly ${next.autoQuarantineRiskThreshold})`,
      metadata: { rawAction: 'system.settings_updated' },
    });

    return next;
  }
}

