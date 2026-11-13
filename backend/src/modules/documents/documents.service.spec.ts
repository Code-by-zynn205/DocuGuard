import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentsService } from './documents.service.js';
import { IntegrityStatus, HealthStatus } from '../../database/schemas/document.schema.js';

describe('DocumentsService - Unit Tests', () => {
  let service: DocumentsService;

  beforeEach(() => {
    // Mock dependencies
    const mockDocumentModel: any = {};
    const mockVersionModel: any = {};
    const mockIncidentModel: any = {};
    const mockRecoveryModel: any = {};
    const mockN8nClient: any = {
      triggerHealthScan: vi.fn().mockResolvedValue(undefined),
      triggerIncidentWorkflow: vi.fn().mockResolvedValue(undefined),
    };

    service = new DocumentsService(
      mockDocumentModel,
      mockVersionModel,
      mockIncidentModel,
      mockRecoveryModel,
      mockN8nClient,
    );
  });

  describe('calculateHealthScore', () => {
    it('cho điểm tối đa 100 cho tài liệu hoàn hảo (có mô tả, dung lượng > 0, nguyên vẹn, hạn xa)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);

      const result = service.calculateHealthScore({
        description: 'Tài liệu hợp đồng đầy đủ thông tin chi tiết',
        expiresAt: futureDate,
        fileSize: 1024,
        integrityStatus: IntegrityStatus.INTACT,
      });

      expect(result.score).toBe(100);
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.deductions.length).toBe(0);
    });

    it('trừ 10 điểm khi tài liệu thiếu phần mô tả', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);

      const result = service.calculateHealthScore({
        description: '',
        expiresAt: futureDate,
        fileSize: 1024,
        integrityStatus: IntegrityStatus.INTACT,
      });

      expect(result.score).toBe(90);
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.deductions.some((d) => d.rule === 'MISSING_DESCRIPTION')).toBe(true);
    });

    it('trừ 35 điểm khi tài liệu đã hết hạn (chuyển sang warning hoặc critical)', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const result = service.calculateHealthScore({
        description: 'Mô tả hợp đồng',
        expiresAt: pastDate,
        fileSize: 1024,
        integrityStatus: IntegrityStatus.INTACT,
      });

      expect(result.score).toBe(65);
      expect(result.status).toBe(HealthStatus.WARNING);
      expect(result.deductions.some((d) => d.rule === 'EXPIRED')).toBe(true);
    });

    it('trừ 15 điểm khi tài liệu sắp hết hạn trong vòng 30 ngày', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);

      const result = service.calculateHealthScore({
        description: 'Mô tả hợp đồng',
        expiresAt: soonDate,
        fileSize: 1024,
        integrityStatus: IntegrityStatus.INTACT,
      });

      expect(result.score).toBe(85);
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.deductions.some((d) => d.rule === 'EXPIRING_SOON')).toBe(true);
    });

    it('trừ 50 điểm và gán trạng thái critical khi tệp bị xâm phạm toàn vẹn (tampered)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);

      const result = service.calculateHealthScore({
        description: 'Mô tả hợp đồng',
        expiresAt: futureDate,
        fileSize: 1024,
        integrityStatus: IntegrityStatus.TAMPERED,
      });

      expect(result.score).toBe(50);
      expect(result.status).toBe(HealthStatus.WARNING);
      expect(result.deductions.some((d) => d.rule === 'INTEGRITY_TAMPERED')).toBe(true);
    });

    it('tổng hợp nhiều lỗi khiến điểm rơi xuống critical (< 50)', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const result = service.calculateHealthScore({
        description: '', // -10
        expiresAt: pastDate, // -35
        fileSize: 0, // -50
        integrityStatus: IntegrityStatus.TAMPERED, // -50
      });

      expect(result.score).toBe(0);
      expect(result.status).toBe(HealthStatus.CRITICAL);
      expect(result.deductions.length).toBe(4);
    });
  });
});
