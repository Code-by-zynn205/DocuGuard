import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as zlib from 'node:zlib';
import {
  PdfIntelligenceService,
  extractTextFromPdfBuffer,
  normalizeCompanySlug,
  normalizeIsoDate,
} from './pdf-intelligence.service.js';
import { DocumentCategory, HealthStatus } from '../../database/schemas/document.schema.js';

function createMockFlatePdfBuffer(text: string): Buffer {
  const contentStream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const compressed = zlib.deflateSync(Buffer.from(contentStream, 'latin1'));
  const header = Buffer.from(
    `%PDF-1.4\n1 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`,
    'latin1',
  );
  const footer = Buffer.from('\nendstream\nendobj\n%%EOF', 'latin1');
  return Buffer.concat([header, compressed, footer]);
}

describe('PdfIntelligenceService', () => {
  let service: PdfIntelligenceService;
  let mockDocModel: any;
  let mockVersionModel: any;
  let mockIncidentModel: any;
  let mockAuditService: any;
  let mockGoogleService: any;
  let savedDocRecord: any;

  beforeEach(() => {
    savedDocRecord = {
      _id: { toString: () => '6af77f8846bf5f8c38e79999' },
      title: 'Tài liệu PDF gốc',
      originalFileName: 'tai_lieu_goc.pdf',
      filePath: '/app/storage/documents/non_existent_mock.pdf',
      category: DocumentCategory.OTHER,
      department: 'Chung',
      healthScore: 95,
      healthStatus: HealthStatus.HEALTHY,
      healthDeductions: [],
      tags: ['vault'],
      metadata: {},
      ownerEmail: 'vyltn.23ite@vku.udn.vn',
      save: vi.fn().mockResolvedValue(true),
    };

    mockDocModel = {
      findOne: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(savedDocRecord) }),
        exec: vi.fn().mockResolvedValue(savedDocRecord),
      }),
      create: vi.fn().mockImplementation((payload) =>
        Promise.resolve({
          ...payload,
          _id: { toString: () => '6af77f8846bf5f8c38e80001' },
          save: vi.fn().mockResolvedValue(true),
        }),
      ),
    };

    mockVersionModel = {
      create: vi.fn().mockResolvedValue({}),
    };

    mockIncidentModel = {
      create: vi.fn().mockResolvedValue({}),
    };

    mockAuditService = {
      logAction: vi.fn().mockResolvedValue({}),
    };

    mockGoogleService = {
      getStatus: vi.fn().mockResolvedValue({ connectedEmail: 'vyltn.23ite@vku.udn.vn' }),
      sendGmail: vi.fn().mockResolvedValue({ sent: true, messageId: 'gmail-msg-01' }),
      renameDriveFile: vi.fn().mockResolvedValue({ updated: true }),
      downloadDriveFileById: vi.fn().mockResolvedValue(null),
    };

    service = new PdfIntelligenceService(
      mockDocModel,
      mockVersionModel,
      mockIncidentModel,
      mockAuditService,
      mockGoogleService,
    );
  });

  it('trích xuất được văn bản từ PDF nén FlateDecode bằng Node zlib', () => {
    const pdfBuf = createMockFlatePdfBuffer('Hop dong dich vu Viettel IDC ngay 2026-11-10');
    const extracted = extractTextFromPdfBuffer(pdfBuf);

    expect(extracted).toContain('Hop dong dich vu Viettel IDC ngay 2026-11-10');
    expect(normalizeCompanySlug('Công ty Cổ phần Viettel IDC')).toBe('CongTyCoPhanViettel');
    expect(normalizeIsoDate('Ký ngày 14/11/2026')).toBe('2026-11-14');
  });

  it('chuẩn hóa tên file [HopDong]_CongTy_YYYY-MM-DD.pdf và ghi Audit Log', async () => {
    const pdfBuf = createMockFlatePdfBuffer(
      'Hop dong cung cap ha tang may chu Cong ty: Viettel IDC ky ngay 2026-11-11',
    );
    const fakeFile = {
      buffer: pdfBuf,
      originalname: 'hopdong_tam.pdf',
      mimetype: 'application/pdf',
      size: pdfBuf.length,
    } as Express.Multer.File;

    mockDocModel.findOne.mockReturnValueOnce({
      sort: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
      exec: vi.fn().mockResolvedValue(null),
    });

    const result = await service.classifyAndRenamePdf(fakeFile, {
      documentId: '6af77f8846bf5f8c38e79999',
    });

    expect(result.success).toBe(true);
    expect(result.docType).toBe('HopDong');
    expect(result.standardizedFileName).toMatch(/^\[HopDong\]_.*_2026-11-11\.pdf$/);
    expect(result.incidentCreated).toBe(false);
    expect(mockAuditService.logAction).toHaveBeenCalledTimes(1);
  });

  it('tạo Incident và gửi Gmail cảnh báo khi PDF thuộc nhóm HoSoKhac (OTHER)', async () => {
    const result = await service.classifyAndRenamePdf(undefined, {
      documentId: '6af77f8846bf5f8c38e79999',
      rawText: 'Tai lieu ghi chu ngau nhien chua xac dinh nghiep vu ngay 2026-11-14',
    });

    expect(result.docType).toBe('HoSoKhac');
    expect(result.needsReview).toBe(true);
    expect(result.incidentCreated).toBe(true);
    expect(mockIncidentModel.create).toHaveBeenCalledTimes(1);
    expect(mockGoogleService.sendGmail).toHaveBeenCalledTimes(1);
  });

  it('bóc tách hóa đơn hợp lệ để nhập sổ Audit Log và gửi Gmail xác nhận', async () => {
    const result = await service.auditInvoicePdf(undefined, {
      documentId: '6af77f8846bf5f8c38e79999',
      rawText:
        'HOA DON GTGT Nha cung cap: FPT Telecom MST: 0101234567 Ngay phat hanh: 2026-11-12 Tong tien thanh toan: 24500000 VND',
    });

    expect(result.success).toBe(true);
    expect(result.isSuspicious).toBe(false);
    expect(result.totalAmount).toBe(24500000);
    expect(result.taxCode).toBe('0101234567');
    expect(result.incidentCreated).toBe(false);
    expect(mockAuditService.logAction).toHaveBeenCalledTimes(1);
    expect(mockGoogleService.sendGmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('HÓA ĐƠN THÀNH CÔNG'),
      }),
    );
  });

  it('phát hiện hóa đơn rủi ro, trừ điểm sức khỏe, tạo Incident và cảnh báo Gmail', async () => {
    const result = await service.auditInvoicePdf(undefined, {
      documentId: '6af77f8846bf5f8c38e79999',
      rawText:
        'Hoa don GTGT Nha cung cap: Cong ty X sai ma so thue va nghi ngo gia mao Tong tien: 98000000 VND',
    });

    expect(result.success).toBe(true);
    expect(result.isSuspicious).toBe(true);
    expect(result.incidentCreated).toBe(true);
    expect(result.healthScore).toBeLessThan(95);
    expect(mockIncidentModel.create).toHaveBeenCalledTimes(1);
    expect(mockGoogleService.sendGmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('RỦI RO HÓA ĐƠN'),
      }),
    );
  });
});

