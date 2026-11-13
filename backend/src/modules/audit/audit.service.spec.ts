import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service.js';
import { AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';

describe('AuditService - Unit Tests', () => {
  let service: AuditService;
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      create: vi.fn().mockResolvedValue({}),
      find: vi.fn(),
    };
    service = new AuditService(mockModel);
  });

  it('ghi nhận hành động với đầy đủ metadata và entityId dạng chuỗi', async () => {
    await service.logAction({
      action: AuditAction.DOCUMENT_UPLOAD,
      entityType: AuditEntityType.DOCUMENT,
      entityId: '65f000000000000000000001',
      entityName: 'Hợp đồng Cloud 2026',
      actorName: 'Quản trị viên',
      actorEmail: 'admin@docuguard.io',
      severity: 'info',
      description: 'Tải lên tài liệu mới',
    });

    expect(mockModel.create).toHaveBeenCalledTimes(1);
    const payload = mockModel.create.mock.calls[0][0];
    expect(payload.action).toBe(AuditAction.DOCUMENT_UPLOAD);
    expect(payload.entityType).toBe(AuditEntityType.DOCUMENT);
    expect(payload.entityId).toBe('65f000000000000000000001');
    expect(payload.metadata.entityName).toBe('Hợp đồng Cloud 2026');
    expect(payload.metadata.description).toBe('Tải lên tài liệu mới');
  });

  it('mapAuditLog chuẩn hóa workflow -> automation và suy luận severity chính xác', async () => {
    const exec = vi.fn().mockResolvedValue([
      {
        _id: 'log-1',
        action: AuditAction.DOCUMENT_TAMPER_DETECTED,
        entityType: 'workflow',
        entityId: 'doc-1',
        userEmail: 'admin@docuguard.io',
        metadata: {
          actorName: 'DocuGuard Scanner',
          entityName: 'Tài liệu Mật',
          description: 'Phát hiện sai lệch SHA-256',
        },
        createdAt: new Date('2026-11-10T10:00:00Z'),
      },
    ]);
    mockModel.find.mockReturnValue({
      sort: () => ({ limit: () => ({ exec }) }),
    });

    const results = await service.findAll({ entityType: 'automation' });
    expect(mockModel.find).toHaveBeenCalledWith({
      entityType: { $in: ['automation', 'workflow'] },
    });
    expect(results).toHaveLength(1);
    expect(results[0].entityType).toBe('automation');
    expect(results[0].severity).toBe('critical');
    expect(results[0].entityName).toBe('Tài liệu Mật');
    expect(results[0].description).toBe('Phát hiện sai lệch SHA-256');
  });
});

