import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecoveryService } from './recovery.service.js';
import { RecoveryStatus } from '../../database/schemas/recovery.schema.js';

describe('RecoveryService - Gmail 1-Click Approval Tests', () => {
  let service: RecoveryService;
  let mockRecoveryModel: any;
  let mockDocModel: any;
  let mockIncidentModel: any;

  beforeEach(() => {
    mockRecoveryModel = {
      findOne: vi.fn(),
      findById: vi.fn(),
    };
    mockDocModel = {
      findById: vi.fn(),
    };
    mockIncidentModel = {
      updateMany: vi.fn().mockResolvedValue({}),
    };
    service = new RecoveryService(mockRecoveryModel, mockDocModel, mockIncidentModel);
  });

  it('xử lý từ chối trực tiếp qua token từ Gmail', async () => {
    const saveMock = vi.fn().mockResolvedValue({});
    const recoveryDoc: any = {
      _id: { toString: () => '65f000000000000000000099' },
      status: RecoveryStatus.PENDING_APPROVAL,
      reason: 'Khôi phục test',
      sourceBackupPath: '/app/storage/backups/a.pdf',
      sourceBackupHash: 'abc',
      documentId: 'doc-1',
      save: saveMock,
      toObject() {
        return this;
      },
    };

    mockRecoveryModel.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(recoveryDoc),
    });
    mockRecoveryModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(recoveryDoc),
      populate: () => ({
        populate: () => ({
          populate: () => ({
            exec: vi.fn().mockResolvedValue(recoveryDoc),
          }),
        }),
      }),
    });

    const result = await service.handleEmailAction('valid-token-123', 'reject');
    expect(result.status).toBe('rejected');
    expect(recoveryDoc.status).toBe(RecoveryStatus.REJECTED);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});

