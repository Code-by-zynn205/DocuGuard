import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuditAction,
  AuditEntityType,
  AuditLog,
  AuditLogDocument,
} from '../../database/schemas/audit-log.schema.js';

export interface LogActionParams {
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId?: string | Types.ObjectId;
  entityName?: string;
  actorId?: string | Types.ObjectId;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  severity?: 'info' | 'warning' | 'critical';
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  private inferSeverity(action: string): 'info' | 'warning' | 'critical' {
    const upper = action.toUpperCase();
    if (
      upper.includes('TAMPER') ||
      upper.includes('VIOLATION') ||
      upper.includes('QUARANTINE') ||
      upper.includes('REJECT') ||
      upper.includes('DELETE')
    ) {
      return 'critical';
    }
    if (
      upper.includes('INCIDENT') ||
      upper.includes('RECOVER') ||
      upper.includes('EXPIR')
    ) {
      return 'warning';
    }
    return 'info';
  }

  private mapAuditLog(doc: AuditLogDocument | Record<string, any>) {
    const plain = typeof (doc as any).toObject === 'function' ? (doc as any).toObject() : doc;
    const meta = (plain.metadata ?? {}) as Record<string, unknown>;

    const rawEntityType = (meta.rawEntityType as string | undefined) ?? plain.entityType;
    const mappedEntityType = rawEntityType === 'workflow' ? 'automation' : rawEntityType;

    return {
      _id: String(plain._id),
      action: (meta.rawAction as string | undefined) ?? plain.action,
      entityType: mappedEntityType,
      entityId: plain.entityId ? String(plain.entityId) : undefined,
      entityName:
        (meta.entityName as string | undefined) ??
        (meta.title as string | undefined) ??
        undefined,
      actorId: plain.userId ? String(plain.userId) : plain.actorId ? String(plain.actorId) : undefined,
      actorName:
        (meta.actorName as string | undefined) ??
        plain.actorName ??
        plain.userEmail ??
        'Hệ thống DocuGuard',
      actorEmail:
        (meta.actorEmail as string | undefined) ?? plain.userEmail ?? undefined,
      actorRole: plain.userRole ?? plain.actorRole,
      severity:
        (meta.severity as 'info' | 'warning' | 'critical' | undefined) ??
        this.inferSeverity(String(plain.action || '')),
      description:
        (meta.description as string | undefined) ?? plain.details ?? undefined,
      details: (meta.description as string | undefined) ?? plain.details,
      metadata: meta,
      ipAddress: plain.ipAddress,
      createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  async logAction(params: LogActionParams): Promise<void> {
    try {
      const userObjectId =
        params.actorId && Types.ObjectId.isValid(String(params.actorId))
          ? new Types.ObjectId(String(params.actorId))
          : undefined;

      const validAction = Object.values(AuditAction).includes(params.action as AuditAction)
        ? (params.action as AuditAction)
        : AuditAction.WORKFLOW_HEALTH_SCAN;

      const validEntityType = Object.values(AuditEntityType).includes(
        params.entityType as AuditEntityType,
      )
        ? (params.entityType as AuditEntityType)
        : AuditEntityType.SYSTEM;

      const entityIdStr = params.entityId ? String(params.entityId) : 'system';

      await this.auditLogModel.create({
        action: validAction,
        entityType: validEntityType,
        entityId: entityIdStr,
        userId: userObjectId,
        userEmail: params.actorEmail,
        userRole: params.actorRole || 'system',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: 'success',
        metadata: {
          ...(params.metadata ?? {}),
          rawAction: params.action,
          rawEntityType: String(params.entityType),
          actorName: params.actorName || 'Hệ thống DocuGuard',
          ...(params.description ? { description: params.description } : {}),
          ...(params.entityName ? { entityName: params.entityName } : {}),
          ...(params.actorEmail ? { actorEmail: params.actorEmail } : {}),
          ...(params.severity ? { severity: params.severity } : {}),
        },
      });
    } catch (error: any) {
      this.logger.warn(`Không thể ghi audit log (${params.action}): ${error?.message}`);
    }
  }

  async findAll(filters?: {
    entityType?: string;
    action?: string;
    search?: string;
    limit?: number;
  }) {
    const query: Record<string, unknown> = {};

    if (filters?.entityType && filters.entityType !== 'all') {
      if (filters.entityType === 'automation') {
        query.entityType = { $in: ['automation', 'workflow'] };
      } else {
        query.entityType = filters.entityType;
      }
    }

    if (filters?.action && filters.action !== 'all') {
      query.action = filters.action;
    }

    if (filters?.search && filters.search.trim()) {
      const regex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { action: regex },
        { userEmail: regex },
        { 'metadata.actorName': regex },
        { 'metadata.description': regex },
        { 'metadata.entityName': regex },
      ];
    }

    const limit = Math.min(Math.max(Number(filters?.limit) || 100, 1), 500);
    const logs = await this.auditLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return logs.map((log) => this.mapAuditLog(log));
  }

  async findRecent(limit = 10) {
    return this.findAll({ limit });
  }

  async findByEntity(entityType: string, entityId: string) {
    const query: Record<string, unknown> = {
      entityType: entityType === 'automation' ? { $in: ['automation', 'workflow'] } : entityType,
      entityId,
    };
    const logs = await this.auditLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    return logs.map((log) => this.mapAuditLog(log));
  }
}
