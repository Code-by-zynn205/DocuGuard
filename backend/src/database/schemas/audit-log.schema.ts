import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './user.schema.js';

export type AuditLogDocument = HydratedDocument<AuditLog>;

export enum AuditAction {
  // Document actions
  DOCUMENT_UPLOAD = 'document.upload',
  DOCUMENT_VIEW = 'document.view',
  DOCUMENT_DOWNLOAD = 'document.download',
  DOCUMENT_UPDATE = 'document.update',
  DOCUMENT_DELETE = 'document.delete',
  DOCUMENT_INTEGRITY_CHECK = 'document.integrity_check',
  DOCUMENT_TAMPER_DETECTED = 'document.tamper_detected',
  DOCUMENT_VERSION_RESTORE = 'document.version_restore',

  // Recovery actions
  RECOVERY_REQUESTED = 'recovery.requested',
  RECOVERY_APPROVED = 'recovery.approved',
  RECOVERY_REJECTED = 'recovery.rejected',
  RECOVERY_EXECUTED = 'recovery.executed',

  // Incident actions
  INCIDENT_CREATED = 'incident.created',
  INCIDENT_ASSIGNED = 'incident.assigned',
  INCIDENT_STATUS_CHANGE = 'incident.status_change',
  INCIDENT_RESOLVED = 'incident.resolved',

  // Workflow & Automation
  WORKFLOW_HEALTH_SCAN = 'workflow.health_scan',
  WORKFLOW_AUTO_REMEDIATION = 'workflow.auto_remediation',
  WORKFLOW_RENEWAL_REMINDER = 'workflow.renewal_reminder',
  WORKFLOW_FAILURE_ALERT = 'workflow.failure_alert',

  // Auth actions
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
}

export enum AuditEntityType {
  DOCUMENT = 'document',
  DOCUMENT_VERSION = 'document_version',
  INCIDENT = 'incident',
  RECOVERY = 'recovery',
  WORKFLOW = 'workflow',
  USER = 'user',
  SYSTEM = 'system',
}

@Schema({
  timestamps: { createdAt: true, updatedAt: false }, // Audit logs are immutable
  collection: 'audit_logs',
})
export class AuditLog {
  @Prop({
    type: String,
    enum: Object.values(AuditAction),
    required: true,
    index: true,
  })
  action!: AuditAction;

  @Prop({
    type: String,
    enum: Object.values(AuditEntityType),
    required: true,
    index: true,
  })
  entityType!: AuditEntityType;

  @Prop({ required: true, index: true })
  entityId!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop({ trim: true })
  userEmail?: string;

  @Prop({ trim: true })
  userRole?: string;

  @Prop({ trim: true })
  ipAddress?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ default: 'success', enum: ['success', 'failure'] })
  status!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata!: Record<string, unknown>; // Lưu chi tiết oldValues, newValues, diff, error
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Query Optimization Indexes
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });
