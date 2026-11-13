import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsService } from './settings.service.js';

describe('SettingsService - Unit Tests', () => {
  let service: SettingsService;
  let mockCollection: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockCollection = {
      findOne: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };
    const mockConnection: any = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };
    mockAuditService = {
      logAction: vi.fn().mockResolvedValue(undefined),
    };
    service = new SettingsService(mockConnection, mockAuditService);
  });

  it('khởi tạo và trả về cấu hình mặc định khi database chưa có bản ghi', async () => {
    mockCollection.findOne.mockResolvedValue(null);

    const result = await service.getSettings();
    expect(result.organizationCode).toBe('DG-VN-ENT');
    expect(result.autoQuarantineRiskThreshold).toBe(40);
    expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);
  });

  it('cập nhật từng phần cấu hình và ghi nhận audit log', async () => {
    mockCollection.findOne.mockResolvedValue({
      _id: 'global_settings',
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
    });

    const updated = await service.updateSettings({
      autoQuarantineRiskThreshold: 55,
      require2FA: false,
    });

    expect(updated.autoQuarantineRiskThreshold).toBe(55);
    expect(updated.require2FA).toBe(false);
    expect(updated.organizationName).toBe('DocuGuard Enterprise Compliance');
    expect(mockAuditService.logAction).toHaveBeenCalledTimes(1);
  });
});

