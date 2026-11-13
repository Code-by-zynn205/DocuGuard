import { Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, type Connection } from 'mongoose';
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
  workflowKey: string;
  workflowType: WorkflowType;
  description: string;
  isActive: boolean;
  webhookPath: string;
  scheduleCron?: string;
  n8nWorkflowId?: string;
  lastRunAt?: string;
  lastStatus: 'success' | 'failed' | 'running' | 'idle';
  lastDurationMs?: number;
  successCount: number;
  failureCount: number;
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

  async onModuleInit() {
    try {
      const count = await this.collection.countDocuments();
      if (count === 0) {
        await this.collection.insertMany(DEFAULT_WORKFLOWS as any[]);
      }
    } catch (error: any) {
      this.logger.warn(`Không thể khởi tạo automation_workflows mặc định: ${error?.message}`);
    }
  }

  async findAll(): Promise<AutomationWorkflowRecord[]> {
    let workflows = (await this.collection.find({}).toArray()) as unknown as AutomationWorkflowRecord[];
    if (workflows.length === 0) {
      await this.collection.insertMany(DEFAULT_WORKFLOWS as any[]);
      workflows = (await this.collection.find({}).toArray()) as unknown as AutomationWorkflowRecord[];
    }

    // Gộp thêm thống kê từ bảng automation_logs nếu có log mới hơn
    const logs = await this.automationLogModel
      .find({})
      .sort({ startedAt: -1 })
      .limit(100)
      .exec();

    return workflows.map((wf) => {
      const matchingLogs = logs.filter((l) => l.workflowType === wf.workflowType);
      const latestLog = matchingLogs[0];
      const successLogs = matchingLogs.filter(
        (l) => l.status === WorkflowExecutionStatus.SUCCESS,
      ).length;
      const failedLogs = matchingLogs.filter(
        (l) => l.status === WorkflowExecutionStatus.FAILED || l.status === WorkflowExecutionStatus.STUCK,
      ).length;

      return {
        _id: String(wf._id),
        name: wf.name,
        workflowKey: wf.workflowKey,
        workflowType: wf.workflowType,
        description: wf.description,
        isActive: Boolean(wf.isActive),
        webhookPath: wf.webhookPath,
        scheduleCron: wf.scheduleCron,
        n8nWorkflowId: wf.n8nWorkflowId,
        lastRunAt:
          latestLog?.startedAt?.toISOString() ?? wf.lastRunAt,
        lastStatus:
          (latestLog?.status === WorkflowExecutionStatus.STUCK ||
          latestLog?.status === WorkflowExecutionStatus.RETRYING
            ? 'running'
            : latestLog?.status) ??
          wf.lastStatus ??
          'idle',
        lastDurationMs: latestLog?.durationMs ?? wf.lastDurationMs,
        successCount: Math.max(wf.successCount ?? 0, successLogs),
        failureCount: Math.max(wf.failureCount ?? 0, failedLogs),
      };
    });
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

  async triggerWorkflow(id: string, triggerSource = 'manual') {
    const wf = (await this.collection.findOne({ _id: id as any })) as unknown as AutomationWorkflowRecord | null;
    if (!wf) {
      throw new NotFoundException(`Không tìm thấy workflow: ${id}`);
    }

    const startedAt = new Date();
    let success = true;
    let details: Record<string, unknown> = {};

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
          await this.n8nClient.triggerHealthScan({ triggerSource, workflowId: id });
        }
      } else if (wf.workflowKey === 'incident-resolution') {
        await this.n8nClient.triggerIncidentWorkflow({
          triggerSource,
          workflowId: id,
          testRun: true,
        });
      } else if (wf.workflowKey === 'safe-recovery') {
        await this.n8nClient.triggerSafeRecovery({
          triggerSource,
          workflowId: id,
          testRun: true,
        });
      } else if (wf.workflowKey === 'web-clipper') {
        await this.n8nClient.triggerWebClipper({
          triggerSource,
          workflowId: id,
          testRun: true,
        });
      } else {
        await this.n8nClient.triggerHealthScan({ triggerSource, workflowId: id, monitorCheck: true });
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
        $inc: success ? { successCount: 1 } : { failureCount: 1 },
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

