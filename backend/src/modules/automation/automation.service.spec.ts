import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutomationService } from './automation.service.js';
import { WorkflowType } from '../../database/schemas/automation-log.schema.js';

describe('AutomationService - n8n Workflow Triggers', () => {
  let service: AutomationService;
  let workflowsCol: any;
  let documentsCol: any;
  let usersCol: any;
  let mockLogModel: any;
  let mockN8nClient: any;

  const sampleDoc = {
    _id: { toString: () => '6af77f8846bf5f8c38e73823' },
    title: 'Hợp đồng bảo mật NDA',
    ownerEmail: 'vyltn.23ite@vku.udn.vn',
    isConfidential: true,
  };

  beforeEach(() => {
    workflowsCol = {
      countDocuments: vi.fn().mockResolvedValue(4),
      insertMany: vi.fn(),
      findOne: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({}),
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    };
    documentsCol = {
      findOne: vi.fn().mockResolvedValue(sampleDoc),
    };
    usersCol = {
      findOne: vi.fn().mockResolvedValue({ email: 'vyltn.23ite@vku.udn.vn' }),
    };

    const mockConnection: any = {
      collection: vi.fn((name: string) => {
        if (name === 'automation_workflows') return workflowsCol;
        if (name === 'documents') return documentsCol;
        if (name === 'users') return usersCol;
        return {};
      }),
    };

    mockLogModel = {
      create: vi.fn().mockResolvedValue({}),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    mockN8nClient = {
      triggerHealthScan: vi.fn().mockResolvedValue(true),
      triggerIncidentWorkflow: vi.fn().mockResolvedValue(true),
      triggerSafeRecovery: vi.fn().mockResolvedValue(true),
      triggerWebClipper: vi.fn().mockResolvedValue(true),
      triggerPdfClassify: vi.fn().mockResolvedValue(true),
      triggerInvoiceAudit: vi.fn().mockResolvedValue(true),
    };

    service = new AutomationService(mockConnection, mockLogModel, mockN8nClient);
  });

  it('gửi kèm documentId thật khi kích hoạt Safe Recovery', async () => {
    workflowsCol.findOne.mockResolvedValue({
      _id: 'wf-safe-recovery',
      name: 'Safe Recovery',
      workflowKey: 'safe-recovery',
      workflowType: WorkflowType.RENEWAL_REMINDER,
      webhookPath: '/webhook/safe-recovery',
      isActive: true,
    });

    const result = await service.triggerWorkflow('wf-safe-recovery', 'manual');

    expect(result.success).toBe(true);
    expect(mockN8nClient.triggerSafeRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: '6af77f8846bf5f8c38e73823',
        ownerEmail: 'vyltn.23ite@vku.udn.vn',
      }),
    );
  });

  it('gửi payload n8n-automation-test hợp lệ khi kích hoạt Web Clipper', async () => {
    workflowsCol.findOne.mockResolvedValue({
      _id: 'wf-web-clipper',
      name: 'Smart Web Clipper AI',
      workflowKey: 'web-clipper',
      workflowType: WorkflowType.WORKFLOW_MONITOR,
      webhookPath: '/webhook/web-clipper',
      isActive: true,
    });

    const result = await service.triggerWorkflow('wf-web-clipper', 'manual');

    expect(result.success).toBe(true);
    expect(mockN8nClient.triggerWebClipper).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcePlatform: 'n8n-automation-test',
        selectedText: expect.any(String),
        userEmail: 'vyltn.23ite@vku.udn.vn',
      }),
    );
  });

  it('báo thất bại trung thực khi webhook n8n không phản hồi', async () => {
    workflowsCol.findOne.mockResolvedValue({
      _id: 'wf-incident-resolution',
      name: 'Incident Resolution',
      workflowKey: 'incident-resolution',
      workflowType: WorkflowType.AUTO_REMEDIATION,
      webhookPath: '/webhook/incident-resolution',
      isActive: true,
    });
    mockN8nClient.triggerIncidentWorkflow.mockResolvedValue(false);

    const result = await service.triggerWorkflow('wf-incident-resolution', 'manual');

    expect(result.success).toBe(false);
    expect(String(result.details?.error)).toContain('/webhook/incident-resolution');
  });

  it('gửi documentId thật khi kích hoạt PDF Classify & Auto-Rename', async () => {
    workflowsCol.findOne.mockResolvedValue({
      _id: 'wf-pdf-classify',
      name: 'DocuGuard — Phân Loại PDF & Chuẩn Hóa Tên (AI)',
      workflowKey: 'pdf-classify-rename',
      workflowType: WorkflowType.WORKFLOW_MONITOR,
      webhookPath: '/webhook/pdf-classify-rename',
      isActive: true,
    });

    const result = await service.triggerWorkflow('wf-pdf-classify', 'manual');

    expect(result.success).toBe(true);
    expect(mockN8nClient.triggerPdfClassify).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: '6af77f8846bf5f8c38e73823',
        ownerEmail: 'vyltn.23ite@vku.udn.vn',
      }),
    );
  });

  it('gửi documentId hóa đơn khi kích hoạt Invoice AI Audit', async () => {
    workflowsCol.findOne.mockResolvedValue({
      _id: 'wf-invoice-audit',
      name: 'DocuGuard — Kế Toán AI Bóc Tách & Kiểm Toán Hóa Đơn',
      workflowKey: 'invoice-audit',
      workflowType: WorkflowType.AUTO_REMEDIATION,
      webhookPath: '/webhook/invoice-audit',
      isActive: true,
    });

    const result = await service.triggerWorkflow('wf-invoice-audit', 'manual');

    expect(result.success).toBe(true);
    expect(mockN8nClient.triggerInvoiceAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: '6af77f8846bf5f8c38e73823',
        ownerEmail: 'vyltn.23ite@vku.udn.vn',
      }),
    );
  });
});

