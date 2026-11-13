import { describe, it, expect, vi } from 'vitest';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService - Unit Tests', () => {
  it('trả về đầy đủ cả field legacy và field DashboardSummary cho frontend', async () => {
    const mockDocumentModel: any = {
      countDocuments: vi
        .fn()
        .mockResolvedValueOnce(5) // totalDocuments
        .mockResolvedValueOnce(1) // expiringSoonCount
        .mockResolvedValueOnce(3) // healthy
        .mockResolvedValueOnce(1) // warning
        .mockResolvedValueOnce(1), // critical
      aggregate: vi.fn().mockResolvedValue([{ _id: null, avgScore: 78.4 }]),
      find: vi.fn().mockReturnValue({
        sort: () => ({
          limit: () => ({
            select: () => ({
              exec: vi.fn().mockResolvedValue([
                {
                  _id: { toString: () => 'doc-1' },
                  title: 'Hợp đồng Mật',
                  originalFileName: 'hd.pdf',
                  department: 'Pháp Chế',
                  healthScore: 25,
                  healthStatus: 'critical',
                  integrityStatus: 'tampered',
                  category: 'contract',
                  healthDeductions: [{ reason: 'Sai lệch SHA-256' }],
                },
              ]),
            }),
          }),
        }),
      }),
    };

    const mockIncidentModel: any = {
      countDocuments: vi.fn().mockResolvedValue(2),
      find: vi.fn().mockReturnValue({
        sort: () => ({
          limit: () => ({
            populate: () => ({
              exec: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    };

    const service = new DashboardService(mockDocumentModel, mockIncidentModel);
    const stats = await service.getStats();

    expect(stats.totalDocuments).toBe(5);
    expect(stats.averageHealthScore).toBe(78);
    expect(stats.overallHealthScore).toBe(78);
    expect(stats.activeIncidents).toBe(2);
    expect(stats.openIncidents).toBe(2);
    expect(stats.healthyDocuments).toBe(3);
    expect(stats.warningDocuments).toBe(1);
    expect(stats.criticalDocuments).toBe(1);
    expect(stats.expiringDocuments).toBe(1);
    expect(stats.riskRadar[0].documentId).toBe('doc-1');
    expect(stats.riskRadar[0].department).toBe('Pháp Chế');
    expect(stats.riskRadar[0].primaryRiskReason).toBe('Sai lệch SHA-256');
  });
});

