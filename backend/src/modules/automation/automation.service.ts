import { Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types, type Connection } from 'mongoose';
import {
  AutomationLog,
  AutomationLogDocument,
  TriggerSource,
  WorkflowExecutionStatus,
  WorkflowType,
} from '../../database/schemas/automation-log.schema.js';
import { AuditAction, AuditEntityType } from '../../database/schemas/audit-log.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { N8nClient } from '../../integrations/n8n/n8n.client.js';
import { HealthScannerService } from '../health-scanner/health-scanner.service.js';

export interface AutomationWorkflowRecord {
  _id: string;
  name: string;
  workflowName?: string;
  workflowKey: string;
  workflowType: WorkflowType;
  description: string;
  isActive: boolean;
  webhookPath: string;
  webhookUrl?: string;
  scheduleCron?: string;
  n8nWorkflowId?: string;
  triggerSource?: string;
  status?: string;
  lastRunAt?: string;
  lastStatus: 'success' | 'failed' | 'running' | 'idle';
  lastDurationMs?: number;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  successCount: number;
  failureCount: number;
  scannedDocumentsCount?: number;
  healthyCount?: number;
  warningCount?: number;
  criticalCount?: number;
  incidentsCreatedCount?: number;
  notificationsSentCount?: number;
  retryCount?: number;
  successRate?: number;
}

const DEFAULT_WORKFLOWS: AutomationWorkflowRecord[] = [
  {
    _id: 'wf-health-scanner',
    name: 'DocuGuard — Quét Sức Khỏe & Toàn Vẹn Định Kỳ',
    workflowKey: 'document-health-scan',
    workflowType: WorkflowType.HEALTH_SCANNER,
    description:
      'Quét toàn bộ kho tài liệu, kiểm tra mã băm SHA-256, chấm điểm sức khỏe (0-100) và tự động lập sự cố khi phát hiện bất thường.',
    isActive: true,
    webhookPath: '/webhook/document-health-scan',
    scheduleCron: '0 2 * * *',
    n8nWorkflowId: 'fmzITKY83ZvpYTNr',
    lastStatus: 'idle',
    successCount: 0,
    failureCount: 0,
  },
  {
    _id: 'wf-incident-resolution',
    name: 'DocuGuard — Điều Phối Xử Lý Sự Cố Tự Động',
    workflowKey: 'incident-resolution',
    workflowType: WorkflowType.AUTO_REMEDIATION,
    description:
      'Tiếp nhận cảnh báo sai lệch SHA-256 hoặc tài liệu nguy hiểm, phân loại mức độ nghiêm trọng và điều phối phản ứng tự động qua n8n.',
    isActive: true,
    webhookPath: '/webhook/incident-resolution',
    lastStatus: 'idle',
    successCount: 0,
    failureCount: 0,
  },
  {
    _id: 'wf-safe-recovery',
    name: 'DocuGuard — Khôi Phục An Toàn & Phê Duyệt Gmail 1-Click',
    workflowKey: 'safe-recovery',
    workflowType: WorkflowType.RENEWAL_REMINDER,
    description:
      'Điều phối luồng khôi phục 1-click từ bản sao lưu bảo mật và gửi nút phê duyệt trực tiếp qua Gmail đối với tài liệu tối mật.',
    isActive: true,
    webhookPath: '/webhook/safe-recovery',
    lastStatus: 'idle',
    successCount: 0,
    failureCount: 0,
  },
  {
    _id: 'wf-web-clipper',
    name: 'DocuGuard — Smart Web Clipper AI (Google / Facebook)',
    workflowKey: 'web-clipper',
    workflowType: WorkflowType.WORKFLOW_MONITOR,
    description:
      'Nhận đoạn dữ liệu người dùng bôi đen khi lướt Google/Facebook, dùng Groq AI phân loại, niêm phong SHA-256 và lưu vào Drive + Gmail.',
    isActive: true,
    webhookPath: '/webhook/web-clipper',
    lastStatus: 'idle',
    successCount: 0,
    failureCount: 0,
  },
  {
    _id: 'wf-pdf-classify',
    name: 'DocuGuard — Phân Loại PDF & Chuẩn Hóa Tên (AI)',
    workflowKey: 'pdf-classify-rename',
    workflowType: WorkflowType.WORKFLOW_MONITOR,
    description:
      'Đọc nội dung bên trong file PDF, bóc metadata (Loại, Công ty, Ngày), tự chuẩn hóa tên [Loai]_CongTy_Ngay.pdf và cảnh báo hồ sơ lạ.',
    isActive: true,
    webhookPath: '/webhook/pdf-classify-rename',
    n8nWorkflowId: 'pdfClassifyRename',
    lastStatus: 'idle',
    successCount: 0,
    failureCount: 0,
  },
  {
    _id: 'wf-invoice-audit',
    name: 'DocuGuard — Kế Toán AI Bóc Tách & Kiểm Toán Hóa Đơn',
    workflowKey: 'invoice-audit',
    workflowType: WorkflowType.AUTO_REMEDIATION,
    description:
      'Kế toán AI bóc nhà cung cấp, ngày chứng từ, tổng tiền VNĐ từ hóa đơn PDF, ghi sổ kiểm toán hoặc lập Incident khi phát hiện hóa đơn rủi ro.',
    isActive: true,
    webhookPath: '/webhook/invoice-audit',
    n8nWorkflowId: 'invoiceAiAudit',
    lastStatus: 'idle',
    successCount: 0,
    failureCount: 0,
  },
];

@Injectable()
export class AutomationService implements OnModuleInit {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(AutomationLog.name)
    private readonly automationLogModel: Model<AutomationLogDocument>,
    private readonly n8nClient: N8nClient,
    @Optional() private readonly healthScannerService?: HealthScannerService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private get collection() {
    return this.connection.collection('automation_workflows');
  }

  private async ensureDefaultWorkflows() {
    for (const wf of DEFAULT_WORKFLOWS) {
      await this.collection.updateOne(
        { _id: wf._id as any },
        { $setOnInsert: wf as any },
        { upsert: true },
      );
    }
  }

  async onModuleInit() {
    try {
      const count = await this.collection.countDocuments();
      if (count === 0) {
        await this.collection.insertMany(DEFAULT_WORKFLOWS as any[]);
      } else if (count < DEFAULT_WORKFLOWS.length) {
        await this.ensureDefaultWorkflows();
      }
    } catch (error: any) {
      this.logger.warn(`Không thể khởi tạo automation_workflows mặc định: ${error?.message}`);
    }
  }

  private async findTargetDocument(
    targetDocumentId?: string,
    preferConfidential = false,
    preferFinancial = false,
  ): Promise<Record<string, any> | null> {
    const docsCollection = this.connection.collection('documents');

    if (targetDocumentId && Types.ObjectId.isValid(targetDocumentId)) {
      const exactDoc = await docsCollection.findOne({
        _id: new Types.ObjectId(targetDocumentId),
        status: { $ne: 'deleted' },
      });
      if (exactDoc) {
        return exactDoc as Record<string, any>;
      }
    }

    if (preferFinancial) {
      const financialDoc = await docsCollection.findOne(
        {
          status: { $ne: 'deleted' },
          $or: [
            { category: 'financial' },
            { title: { $regex: 'hóa đơn|hoa don|invoice|vat', $options: 'i' } },
          ],
        },
        { sort: { updatedAt: -1 } },
      );
      if (financialDoc) {
        return financialDoc as Record<string, any>;
      }
    }

    if (preferConfidential) {
      const confidentialDoc = await docsCollection.findOne(
        { isConfidential: true, status: { $ne: 'deleted' } },
        { sort: { updatedAt: -1 } },
      );
      if (confidentialDoc) {
        return confidentialDoc as Record<string, any>;
      }
    }

    const fallbackDoc = await docsCollection.findOne(
      { status: { $ne: 'deleted' } },
      { sort: { updatedAt: -1 } },
    );
    return (fallbackDoc as Record<string, any> | null) ?? null;
  }

  private async findDefaultOwnerEmail(): Promise<string> {
    const usersCollection = this.connection.collection('users');
    const googleUser = await usersCollection.findOne(
      {
        $or: [
          { googleRefreshToken: { $exists: true, $ne: '' } },
          { googleAccessToken: { $exists: true, $ne: '' } },
        ],
      },
      { sort: { updatedAt: -1 } },
    );
    if (googleUser?.email) {
      return String(googleUser.email);
    }

    const anyUser = await usersCollection.findOne({}, { sort: { updatedAt: -1 } });
    return anyUser?.email ? String(anyUser.email) : 'admin@docuguard.io';
  }

  private mapWorkflowRecord(
    wf: AutomationWorkflowRecord,
    logs: AutomationLogDocument[],
  ): AutomationWorkflowRecord {
    const matchingLogs = logs.filter((l) =>
      l.workflowName ? l.workflowName === wf.name : l.workflowType === wf.workflowType,
    );
    const latestLog = matchingLogs[0];
    const successLogs = matchingLogs.filter(
      (l) => l.status === WorkflowExecutionStatus.SUCCESS,
    ).length;
    const failedLogs = matchingLogs.filter(
      (l) =>
        l.status === WorkflowExecutionStatus.FAILED ||
        l.status === WorkflowExecutionStatus.STUCK,
    ).length;

    const successCount = Math.max(wf.successCount ?? 0, successLogs);
    const failureCount = Math.max(wf.failureCount ?? 0, failedLogs);
    const totalRuns = successCount + failureCount;
    const successRate =
      totalRuns > 0 ? Number(((successCount / totalRuns) * 100).toFixed(1)) : 100;

    const mappedStatus =
      (latestLog?.status === WorkflowExecutionStatus.STUCK ||
      latestLog?.status === WorkflowExecutionStatus.RETRYING
        ? 'running'
        : latestLog?.status) ??
      wf.lastStatus ??
      'idle';

    const sumLogMetric = (
      selector: (item: AutomationLogDocument) => number | undefined,
    ) => matchingLogs.reduce((acc, item) => acc + (selector(item) ?? 0), 0);

    const startedAt =
      latestLog?.startedAt?.toISOString() ?? wf.lastRunAt ?? new Date().toISOString();
    const completedAt = latestLog?.completedAt?.toISOString() ?? wf.lastRunAt;
    const durationMs = latestLog?.durationMs ?? wf.lastDurationMs;

    return {
      _id: String(wf._id),
      name: wf.name,
      workflowName: wf.name,
      workflowKey: wf.workflowKey,
      workflowType: wf.workflowType,
      description: wf.description,
      isActive: Boolean(wf.isActive),
      webhookPath: wf.webhookPath,
      webhookUrl: wf.webhookPath,
      scheduleCron: wf.scheduleCron,
      n8nWorkflowId: wf.n8nWorkflowId,
      triggerSource: latestLog?.triggerSource ?? (wf.scheduleCron ? 'cron' : 'manual'),
      status: mappedStatus,
      lastRunAt: startedAt,
      lastStatus: mappedStatus,
      lastDurationMs: durationMs,
      durationMs,
      startedAt,
      completedAt,
      successCount,
      failureCount,
      scannedDocumentsCount: Math.max(
        wf.scannedDocumentsCount ?? 0,
        sumLogMetric((l) => l.scannedDocumentsCount),
      ),
      healthyCount: Math.max(
        wf.healthyCount ?? 0,
        sumLogMetric((l) => l.healthyCount),
      ),
      warningCount: Math.max(
        wf.warningCount ?? 0,
        sumLogMetric((l) => l.warningCount),
      ),
      criticalCount: Math.max(
        wf.criticalCount ?? 0,
        sumLogMetric((l) => l.criticalCount),
      ),
      incidentsCreatedCount: Math.max(
        wf.incidentsCreatedCount ?? 0,
        sumLogMetric((l) => l.incidentsCreatedCount),
      ),
      notificationsSentCount: Math.max(
        wf.notificationsSentCount ?? 0,
        sumLogMetric((l) => l.notificationsSentCount),
      ),
      retryCount: 0,
      successRate,
    };
  }

  async findAll(): Promise<AutomationWorkflowRecord[]> {
    let workflows = (await this.collection.find({}).toArray()) as unknown as AutomationWorkflowRecord[];
    if (workflows.length === 0) {
      await this.collection.insertMany(DEFAULT_WORKFLOWS as any[]);
      workflows = (await this.collection.find({}).toArray()) as unknown as AutomationWorkflowRecord[];
    } else if (workflows.length < DEFAULT_WORKFLOWS.length) {
      await this.ensureDefaultWorkflows();
      workflows = (await this.collection.find({}).toArray()) as unknown as AutomationWorkflowRecord[];
    }

    // Gộp thêm thống kê từ bảng automation_logs nếu có log mới hơn
    const logs = await this.automationLogModel
      .find({})
      .sort({ startedAt: -1 })
      .limit(100)
      .exec();

    return workflows.map((wf) => this.mapWorkflowRecord(wf, logs));
  }

  async toggleActive(id: string, isActive: boolean) {
    const wf = await this.collection.findOne({ _id: id as any });
    if (!wf) {
      throw new NotFoundException(`Không tìm thấy workflow: ${id}`);
    }

    await this.collection.updateOne(
      { _id: id as any },
      { $set: { isActive: Boolean(isActive), updatedAt: new Date() } },
    );

    await this.auditService?.logAction({
      action: AuditAction.WORKFLOW_HEALTH_SCAN,
      entityType: AuditEntityType.WORKFLOW,
      entityName: String((wf as any).name),
      actorName: 'Quản trị viên DocuGuard',
      severity: 'info',
      description: `${isActive ? 'Kích hoạt' : 'Tạm dừng'} workflow tự động ${(wf as any).name}`,
    });

    const list = await this.findAll();
    return list.find((item) => item._id === id);
  }

  private assertWebhookDelivered(delivered: boolean, webhookPath: string) {
    if (delivered === false) {
      throw new Error(
        `Không thể gọi webhook n8n (${webhookPath}). Hãy kiểm tra workflow đã Publish/Active trên n8n.`,
      );
    }
  }

  async triggerWorkflow(id: string, triggerSource = 'manual', targetDocumentId?: string) {
    const wf = (await this.collection.findOne({ _id: id as any })) as unknown as AutomationWorkflowRecord | null;
    if (!wf) {
      throw new NotFoundException(`Không tìm thấy workflow: ${id}`);
    }

    const startedAt = new Date();
    let success = true;
    let details: Record<string, unknown> = {};
    let incidentsDelta = 0;
    let notificationsDelta = 0;

    try {
      if (wf.workflowKey === 'document-health-scan' || wf.workflowType === WorkflowType.HEALTH_SCANNER) {
        if (this.healthScannerService) {
          const scanResult = await this.healthScannerService.runFullScan(triggerSource);
          details = {
            totalScanned: scanResult.totalScanned,
            averageScore: scanResult.averageScore,
            tamperedCount: scanResult.tamperedCount,
          };
        } else {
          const delivered = await this.n8nClient.triggerHealthScan({ triggerSource, workflowId: id });
          this.assertWebhookDelivered(delivered, wf.webhookPath);
          details = { webhookDelivered: true };
        }
      } else if (wf.workflowKey === 'incident-resolution') {
        const targetDoc = await this.findTargetDocument(targetDocumentId, false);
        const ownerEmail = targetDoc?.ownerEmail || (await this.findDefaultOwnerEmail());
        const delivered = await this.n8nClient.triggerIncidentWorkflow({
          triggerSource,
          workflowId: id,
          documentId: targetDoc ? String(targetDoc._id) : undefined,
          title: targetDoc
            ? `[Automation Test] Kiểm thử xử lý sự cố: ${targetDoc.title}`
            : '[Automation Test] Kiểm thử điều phối sự cố hệ thống',
          description: 'Kích hoạt kiểm thử workflow điều phối xử lý sự cố từ Automation Center',
          severity: 'low',
          ownerEmail,
          testRun: true,
        });
        this.assertWebhookDelivered(delivered, wf.webhookPath);
        incidentsDelta = 1;
        notificationsDelta = 1;
        details = {
          documentId: targetDoc ? String(targetDoc._id) : null,
          ownerEmail,
          webhookDelivered: true,
        };
      } else if (wf.workflowKey === 'safe-recovery') {
        const targetDoc = await this.findTargetDocument(targetDocumentId, true);
        if (!targetDoc) {
          throw new Error('Chưa có tài liệu nào trong Kho tài liệu để thực hiện Safe Recovery.');
        }
        const ownerEmail = targetDoc.ownerEmail || (await this.findDefaultOwnerEmail());
        const delivered = await this.n8nClient.triggerSafeRecovery({
          triggerSource,
          workflowId: id,
          documentId: String(targetDoc._id),
          ownerEmail,
          testRun: true,
        });
        this.assertWebhookDelivered(delivered, wf.webhookPath);
        notificationsDelta = targetDoc.isConfidential ? 1 : 0;
        details = {
          documentId: String(targetDoc._id),
          title: targetDoc.title,
          isConfidential: Boolean(targetDoc.isConfidential),
          webhookDelivered: true,
        };
      } else if (wf.workflowKey === 'web-clipper') {
        const ownerEmail = await this.findDefaultOwnerEmail();
        const delivered = await this.n8nClient.triggerWebClipper({
          triggerSource,
          workflowId: id,
          selectedText: 'Kiểm thử kết nối luồng Smart Web Clipper AI từ DocuGuard Automation Center',
          pageTitle: 'DocuGuard Automation Verification',
          sourceUrl: 'http://localhost:3000/automation',
          sourcePlatform: 'n8n-automation-test',
          userEmail: ownerEmail,
          saveToDrive: false,
          notifyGmail: false,
        });
        this.assertWebhookDelivered(delivered, wf.webhookPath);
        details = {
          sourcePlatform: 'n8n-automation-test',
          userEmail: ownerEmail,
          webhookDelivered: true,
        };
      } else if (wf.workflowKey === 'pdf-classify-rename') {
        const targetDoc = await this.findTargetDocument(targetDocumentId, false, false);
        const ownerEmail = targetDoc?.ownerEmail || (await this.findDefaultOwnerEmail());
        const delivered = await this.n8nClient.triggerPdfClassify({
          triggerSource,
          workflowId: id,
          documentId: targetDoc ? String(targetDoc._id) : undefined,
          ownerEmail,
        });
        this.assertWebhookDelivered(delivered, wf.webhookPath);
        details = {
          documentId: targetDoc ? String(targetDoc._id) : null,
          ownerEmail,
          webhookDelivered: true,
        };
      } else if (wf.workflowKey === 'invoice-audit') {
        const targetDoc = await this.findTargetDocument(targetDocumentId, false, true);
        const ownerEmail = targetDoc?.ownerEmail || (await this.findDefaultOwnerEmail());
        const delivered = await this.n8nClient.triggerInvoiceAudit({
          triggerSource,
          workflowId: id,
          documentId: targetDoc ? String(targetDoc._id) : undefined,
          ownerEmail,
        });
        this.assertWebhookDelivered(delivered, wf.webhookPath);
        notificationsDelta = 1;
        details = {
          documentId: targetDoc ? String(targetDoc._id) : null,
          ownerEmail,
          webhookDelivered: true,
        };
      } else {
        const delivered = await this.n8nClient.triggerHealthScan({
          triggerSource,
          workflowId: id,
          monitorCheck: true,
        });
        this.assertWebhookDelivered(delivered, wf.webhookPath);
        details = { webhookDelivered: true };
      }
    } catch (error: any) {
      success = false;
      details = { error: error?.message };
    }

    const completedAt = new Date();
    const durationMs = Math.max(1, completedAt.getTime() - startedAt.getTime());

    // Đối với workflow không phải health_scanner (health_scanner đã tự ghi log trong runFullScan)
    if (wf.workflowKey !== 'document-health-scan' && wf.workflowType !== WorkflowType.HEALTH_SCANNER) {
      const validTrigger = Object.values(TriggerSource).includes(triggerSource as TriggerSource)
        ? (triggerSource as TriggerSource)
        : TriggerSource.MANUAL;

      await this.automationLogModel.create({
        workflowType: wf.workflowType || WorkflowType.WORKFLOW_MONITOR,
        workflowName: wf.name,
        n8nWorkflowId: wf.n8nWorkflowId,
        triggerSource: validTrigger,
        status: success ? WorkflowExecutionStatus.SUCCESS : WorkflowExecutionStatus.FAILED,
        incidentsCreatedCount: success ? incidentsDelta : 0,
        notificationsSentCount: success ? notificationsDelta : 0,
        errorDetails: success ? undefined : String(details?.error || ''),
        startedAt,
        completedAt,
        durationMs,
        payload: details,
      });

      await this.auditService?.logAction({
        action: AuditAction.WORKFLOW_AUTO_REMEDIATION,
        entityType: AuditEntityType.WORKFLOW,
        entityName: wf.name,
        actorName: 'Quản trị viên DocuGuard',
        severity: success ? 'info' : 'warning',
        description: `Kích hoạt thủ công workflow "${wf.name}" (${success ? 'Thành công' : 'Thất bại'})`,
      });
    }

    await this.collection.updateOne(
      { _id: id as any },
      {
        $set: {
          lastRunAt: completedAt.toISOString(),
          lastStatus: success ? 'success' : 'failed',
          lastDurationMs: durationMs,
        },
        $inc: {
          ...(success ? { successCount: 1 } : { failureCount: 1 }),
          ...(success && incidentsDelta ? { incidentsCreatedCount: incidentsDelta } : {}),
          ...(success && notificationsDelta ? { notificationsSentCount: notificationsDelta } : {}),
        },
      },
    );

    const list = await this.findAll();
    const updated = list.find((item) => item._id === id);

    return {
      success,
      workflow: updated,
      details,
    };
  }
}

