import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  Document,
  DocumentDocument,
  DocumentStatus,
  HealthDeduction,
  HealthStatus,
  IntegrityStatus,
} from '../../database/schemas/document.schema.js';
import {
  Incident,
  IncidentDocument,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '../../database/schemas/incident.schema.js';
import {
  HealthSnapshot,
  HealthSnapshotDocument,
} from '../../database/schemas/health-snapshot.schema.js';
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

@Injectable()
export class HealthScannerService {
  private readonly logger = new Logger(HealthScannerService.name);

  constructor(
    @InjectModel(Document.name)
    private readonly documentModel: Model<DocumentDocument>,
    @InjectModel(Incident.name)
    private readonly incidentModel: Model<IncidentDocument>,
    @InjectModel(HealthSnapshot.name)
    private readonly snapshotModel: Model<HealthSnapshotDocument>,
    @InjectModel(AutomationLog.name)
    private readonly automationLogModel: Model<AutomationLogDocument>,
    private readonly n8nClient: N8nClient,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private resolveLocalFilePath(storedPath: string): string | null {
    if (storedPath && fs.existsSync(storedPath)) {
      return storedPath;
    }
    if (!storedPath) return null;
    const localCandidate = path.resolve(
      process.cwd(),
      'storage',
      'documents',
      path.basename(storedPath),
    );
    return fs.existsSync(localCandidate) ? localCandidate : null;
  }

  private getRecommendedAction(doc: DocumentDocument): string {
    if (doc.integrityStatus === IntegrityStatus.TAMPERED) {
      return 'Khôi phục an toàn ngay từ bản sao lưu SHA-256 (Safe Recovery)';
    }
    if (doc.integrityStatus === IntegrityStatus.MISSING || doc.isMissing) {
      return 'Tệp vật lý bị thiếu — Cần khôi phục bản sao lưu';
    }
    if (doc.expiresAt && new Date(doc.expiresAt).getTime() <= Date.now()) {
      return 'Tài liệu đã hết hạn — Cần gia hạn hoặc lưu trữ';
    }
    if (doc.healthScore < 80) {
      return 'Kiểm tra và bổ sung metadata / phụ lục còn thiếu';
    }
    return 'An toàn — Không cần can thiệp';
  }

  private mapScanResult(doc: DocumentDocument) {
    const hashMatch =
      doc.integrityStatus === IntegrityStatus.INTACT && !doc.isMissing;

    return {
      documentId: doc._id.toString(),
      title: doc.title,
      department: doc.department,
      category: doc.category,
      originalFileName: doc.originalFileName,
      healthScore: doc.healthScore,
      healthStatus: doc.healthStatus,
      integrityStatus: doc.integrityStatus,
      expectedHash: doc.backupHash || doc.fileHash,
      actualHash:
        doc.integrityStatus === IntegrityStatus.TAMPERED
          ? `mismatch-${doc.fileHash.slice(0, 12)}`
          : doc.fileHash,
      hashMatch,
      isConfidential: Boolean(doc.isConfidential),
      deductions: doc.healthDeductions || [],
      lastScannedAt: (
        doc.lastHealthScanAt ||
        doc.lastIntegrityCheckAt ||
        (doc as any).updatedAt ||
        new Date()
      ).toISOString(),
      recommendedAction: this.getRecommendedAction(doc),
    };
  }

  private computeHealth(params: {
    description?: string;
    expiresAt?: Date | null;
    fileSize: number;
    integrityStatus: IntegrityStatus;
    isMissing: boolean;
    hasMissingAppendix?: boolean;
  }): { score: number; status: HealthStatus; deductions: HealthDeduction[] } {
    let score = 100;
    const deductions: HealthDeduction[] = [];
    const now = new Date();

    if (params.integrityStatus === IntegrityStatus.TAMPERED) {
      score -= 65;
      deductions.push({
        rule: 'INTEGRITY_TAMPERED',
        reason: 'Sai lệch mã băm SHA-256 — Phát hiện chỉnh sửa trái phép',
        pointsDeducted: 65,
        detectedAt: now,
      });
    } else if (params.integrityStatus === IntegrityStatus.MISSING || params.isMissing) {
      score -= 70;
      deductions.push({
        rule: 'MISSING_FILE',
        reason: 'Không tìm thấy tệp vật lý trên vùng lưu trữ',
        pointsDeducted: 70,
        detectedAt: now,
      });
    }

    if (!params.description || params.description.trim() === '') {
      score -= 10;
      deductions.push({
        rule: 'MISSING_DESCRIPTION',
        reason: 'Thiếu mô tả chi tiết cho tài liệu',
        pointsDeducted: 10,
        detectedAt: now,
      });
    }

    if (params.expiresAt) {
      const daysLeft = Math.ceil(
        (new Date(params.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft <= 0) {
        score -= 30;
        deductions.push({
          rule: 'EXPIRED',
          reason: 'Tài liệu đã quá hạn hiệu lực',
          pointsDeducted: 30,
          detectedAt: now,
        });
      } else if (daysLeft <= 30) {
        score -= 15;
        deductions.push({
          rule: 'EXPIRING_SOON',
          reason: `Tài liệu sắp hết hạn trong ${daysLeft} ngày`,
          pointsDeducted: 15,
          detectedAt: now,
        });
      }
    }

    if (params.fileSize === 0) {
      score -= 25;
      deductions.push({
        rule: 'EMPTY_FILE',
        reason: 'Tệp rỗng (0 bytes)',
        pointsDeducted: 25,
        detectedAt: now,
      });
    }

    if (params.hasMissingAppendix) {
      score -= 15;
      deductions.push({
        rule: 'MISSING_APPENDIX',
        reason: 'Thiếu phụ lục đính kèm bắt buộc',
        pointsDeducted: 15,
        detectedAt: now,
      });
    }

    const boundedScore = Math.max(0, Math.min(100, score));
    const status =
      boundedScore >= 80
        ? HealthStatus.HEALTHY
        : boundedScore >= 50
          ? HealthStatus.WARNING
          : HealthStatus.CRITICAL;

    return { score: boundedScore, status, deductions };
  }

  async getResults(filters?: { status?: string; search?: string }) {
    const query: Record<string, unknown> = { status: { $ne: DocumentStatus.DELETED } };
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'tampered') {
        query.integrityStatus = IntegrityStatus.TAMPERED;
      } else {
        query.healthStatus = filters.status;
      }
    }
    if (filters?.search && filters.search.trim()) {
      const regex = new RegExp(filters.search.trim(), 'i');
      query.$or = [{ title: regex }, { department: regex }, { originalFileName: regex }];
    }

    const docs = await this.documentModel
      .find(query)
      .sort({ healthScore: 1, updatedAt: -1 })
      .exec();

    return docs.map((doc) => this.mapScanResult(doc));
  }

  async getSummary() {
    const docs = await this.documentModel
      .find({ status: { $ne: DocumentStatus.DELETED } })
      .select('healthScore healthStatus integrityStatus lastHealthScanAt updatedAt')
      .exec();

    const totalScanned = docs.length;
    const averageScore =
      totalScanned > 0
        ? Math.round(docs.reduce((sum, d) => sum + (d.healthScore ?? 0), 0) / totalScanned)
        : 100;

    const healthyCount = docs.filter((d) => d.healthStatus === HealthStatus.HEALTHY).length;
    const warningCount = docs.filter((d) => d.healthStatus === HealthStatus.WARNING).length;
    const criticalCount = docs.filter((d) => d.healthStatus === HealthStatus.CRITICAL).length;
    const tamperedCount = docs.filter(
      (d) =>
        d.integrityStatus === IntegrityStatus.TAMPERED ||
        d.integrityStatus === IntegrityStatus.MISSING,
    ).length;

    const latestScan = docs
      .map((d) => d.lastHealthScanAt || (d as any).updatedAt)
      .filter(Boolean)
      .sort((a: Date, b: Date) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      totalScanned,
      averageScore,
      healthyCount,
      warningCount,
      criticalCount,
      tamperedCount,
      lastScanAt: latestScan ? new Date(latestScan).toISOString() : undefined,
    };
  }

  async runFullScan(triggerSource: TriggerSource | string = TriggerSource.MANUAL) {
    const startedAt = new Date();
    const docs = await this.documentModel
      .find({ status: { $ne: DocumentStatus.DELETED } })
      .exec();

    let incidentsCreatedCount = 0;
    const results = [];

    for (const doc of docs) {
      const resolvedPath = this.resolveLocalFilePath(doc.filePath);

      if (resolvedPath) {
        const buffer = fs.readFileSync(resolvedPath);
        const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const expected = doc.backupHash || doc.fileHash;
        if (actualHash !== expected) {
          doc.integrityStatus = IntegrityStatus.TAMPERED;
        } else {
          doc.integrityStatus = IntegrityStatus.INTACT;
          doc.isMissing = false;
        }
        doc.lastIntegrityCheckAt = new Date();
      } else if (doc.filePath && !doc.filePath.startsWith('/app/')) {
        doc.integrityStatus = IntegrityStatus.MISSING;
        doc.isMissing = true;
      }

      const health = this.computeHealth({
        description: doc.description,
        expiresAt: doc.expiresAt,
        fileSize: doc.fileSize,
        integrityStatus: doc.integrityStatus,
        isMissing: doc.isMissing,
        hasMissingAppendix: doc.hasMissingAppendix,
      });

      doc.healthScore = health.score;
      doc.healthStatus = health.status;
      doc.healthDeductions = health.deductions;
      doc.lastHealthScanAt = new Date();
      await doc.save();

      if (
        doc.integrityStatus === IntegrityStatus.TAMPERED ||
        doc.integrityStatus === IntegrityStatus.MISSING ||
        doc.healthScore < 50
      ) {
        const existingIncident = await this.incidentModel
          .findOne({
            documentId: doc._id,
            status: { $in: [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS] },
          })
          .exec();

        if (!existingIncident) {
          const incidentCode = `INC-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`;
          const isIntegrity = doc.integrityStatus !== IntegrityStatus.INTACT;
          await this.incidentModel.create({
            incidentCode,
            documentId: doc._id,
            title: isIntegrity
              ? `Vi phạm toàn vẹn SHA-256: ${doc.title}`
              : `Cảnh báo điểm sức khỏe thấp (${doc.healthScore}/100): ${doc.title}`,
            severity: isIntegrity ? IncidentSeverity.CRITICAL : IncidentSeverity.HIGH,
            type: isIntegrity
              ? doc.integrityStatus === IntegrityStatus.MISSING
                ? IncidentType.MISSING_FILE
                : IncidentType.INTEGRITY_VIOLATION
              : IncidentType.LOW_HEALTH_SCORE,
            status: IncidentStatus.OPEN,
            description:
              health.deductions.map((d) => d.reason).join('; ') ||
              'Phát hiện bất thường khi quét sức khỏe tài liệu toàn diện',
            timeline: [
              {
                action: 'CREATED',
                note: `Tự động tạo từ Health Scanner (${triggerSource})`,
                timestamp: new Date(),
              },
            ],
          });
          incidentsCreatedCount += 1;
        }
      }

      results.push(this.mapScanResult(doc));
    }

    const totalScanned = docs.length;
    const healthyCount = docs.filter((d) => d.healthStatus === HealthStatus.HEALTHY).length;
    const warningCount = docs.filter((d) => d.healthStatus === HealthStatus.WARNING).length;
    const criticalCount = docs.filter((d) => d.healthStatus === HealthStatus.CRITICAL).length;
    const tamperedCount = docs.filter(
      (d) => d.integrityStatus !== IntegrityStatus.INTACT,
    ).length;
    const averageScore =
      totalScanned > 0
        ? Math.round(docs.reduce((sum, d) => sum + d.healthScore, 0) / totalScanned)
        : 100;

    // Lưu snapshot ngày hôm nay
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const openIncidents = await this.incidentModel.countDocuments({
      status: { $in: [IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS] },
    });
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const expiringIn30DaysDocuments = await this.documentModel.countDocuments({
      status: DocumentStatus.ACTIVE,
      expiresAt: { $lte: in30Days },
    });

    const topRiskRadar = docs
      .slice()
      .sort((a, b) => a.healthScore - b.healthScore)
      .slice(0, 5)
      .map((d) => ({
        documentId: new Types.ObjectId(d._id),
        title: d.title,
        department: d.department,
        healthScore: d.healthScore,
        primaryRiskReason:
          d.healthDeductions?.[0]?.reason || this.getRecommendedAction(d),
      }));

    await this.snapshotModel
      .findOneAndUpdate(
        { snapshotDate: today },
        {
          $set: {
            snapshotDate: today,
            overallHealthScore: averageScore,
            totalDocuments: totalScanned,
            healthyDocuments: healthyCount,
            warningDocuments: warningCount,
            criticalDocuments: criticalCount,
            openIncidents,
            expiringIn30DaysDocuments,
            topRiskRadar,
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    const completedAt = new Date();
    const validTrigger = Object.values(TriggerSource).includes(triggerSource as TriggerSource)
      ? (triggerSource as TriggerSource)
      : TriggerSource.MANUAL;

    await this.automationLogModel.create({
      workflowType: WorkflowType.HEALTH_SCANNER,
      workflowName: 'DocuGuard — Quét Sức Khỏe & Toàn Vẹn Định Kỳ',
      triggerSource: validTrigger,
      status: WorkflowExecutionStatus.SUCCESS,
      scannedDocumentsCount: totalScanned,
      healthyCount,
      warningCount,
      criticalCount,
      incidentsCreatedCount,
      startedAt,
      completedAt,
      durationMs: Math.max(1, completedAt.getTime() - startedAt.getTime()),
      payload: { averageScore, tamperedCount },
    });

    await this.auditService?.logAction({
      action: AuditAction.WORKFLOW_HEALTH_SCAN,
      entityType: AuditEntityType.WORKFLOW,
      entityName: 'Health Scanner Full Scan',
      actorName: validTrigger === TriggerSource.MANUAL ? 'Quản trị viên DocuGuard' : 'Hệ thống tự động',
      severity: tamperedCount > 0 || criticalCount > 0 ? 'warning' : 'info',
      description: `Đã quét ${totalScanned} tài liệu — Điểm TB: ${averageScore}/100, Nguy hiểm: ${criticalCount}, Sai lệch SHA-256: ${tamperedCount}`,
    });

    this.n8nClient
      .triggerHealthScan({
        triggerSource: validTrigger,
        totalScanned,
        averageScore,
        tamperedCount,
        incidentsCreatedCount,
      })
      .catch((err) => {
        this.logger.debug(`n8n health scan webhook optional notify failed: ${err?.message}`);
      });

    return {
      totalScanned,
      averageScore,
      healthyCount,
      warningCount,
      criticalCount,
      tamperedCount,
      incidentsCreatedCount,
      scannedAt: completedAt.toISOString(),
      results,
    };
  }
}

