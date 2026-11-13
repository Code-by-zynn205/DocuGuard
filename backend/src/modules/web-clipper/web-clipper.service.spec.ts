import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebClipperService } from './web-clipper.service.js';
import { DocumentCategory } from '../../database/schemas/document.schema.js';

describe('WebClipperService - Unit Tests', () => {
  let service: WebClipperService;
  let mockDocModel: any;
  let mockVersionModel: any;
  let mockUserModel: any;
  let mockN8nClient: any;

  beforeEach(() => {
    mockDocModel = {
      create: vi.fn().mockImplementation(async (doc) => ({
        ...doc,
        _id: { toString: () => 'clip-doc-1' },
      })),
      find: vi.fn(),
    };
    mockVersionModel = {
      create: vi.fn().mockResolvedValue({}),
    };
    mockUserModel = {
      findOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
    };
    mockN8nClient = {
      triggerWebClipper: vi.fn().mockResolvedValue(undefined),
    };

    service = new WebClipperService(
      mockDocModel,
      mockVersionModel,
      mockUserModel,
      mockN8nClient,
    );
  });

  it('phân loại đoạn text hợp đồng từ Facebook, nhận diện deadline và niêm phong SHA-256', async () => {
    const result = await service.clipAndSave({
      selectedText:
        'Hợp đồng dịch vụ phần mềm áp dụng điều khoản thanh toán đến 30/12/2026 và giữ bí mật thông tin tài khoản.',
      pageTitle: 'Bài viết Facebook nhóm Pháp chế',
      sourceUrl: 'https://www.facebook.com/groups/phapche/posts/123',
      userEmail: 'tester@gmail.com',
    });

    expect(result.classification.category).toBe(DocumentCategory.CONTRACT);
    expect(result.classification.isConfidential).toBe(true);
    expect(result.classification.expiresAt).toBe('2026-12-30T00:00:00.000Z');
    expect(result.document.fileHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.document.tags).toContain('facebook');
    expect(mockDocModel.create).toHaveBeenCalledTimes(1);
    expect(mockVersionModel.create).toHaveBeenCalledTimes(1);
    expect(mockN8nClient.triggerWebClipper).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePlatform: 'n8n-callback',
        selectedText: expect.stringContaining('Hợp đồng dịch vụ phần mềm'),
      }),
    );
  });

  it('xử lý idempotent khi nhận callback từ n8n mà không lưu trùng hoặc lặp webhook', async () => {
    const result = await service.clipAndSave({
      selectedText: 'Kiểm thử luồng Smart Web Clipper AI từ n8n',
      pageTitle: 'DocuGuard Automation Test',
      sourcePlatform: 'n8n-callback',
    });

    expect((result as any).syncedFromN8n).toBe(true);
    expect(mockDocModel.create).not.toHaveBeenCalled();
    expect(mockVersionModel.create).not.toHaveBeenCalled();
    expect(mockN8nClient.triggerWebClipper).not.toHaveBeenCalled();
  });

  it('phân loại đoạn text hóa đơn thuế từ Google', async () => {
    const cls = await service.classifyText(
      'Hướng dẫn xuất hóa đơn VAT điện tử và kê khai thuế thu nhập doanh nghiệp.',
      'Google Search',
      'google',
    );

    expect(cls.category).toBe(DocumentCategory.FINANCIAL);
    expect(cls.department).toBe('Tài Chính Kế Toán');
    expect(cls.tags).toContain('google');
  });
});

