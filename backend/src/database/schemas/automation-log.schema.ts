import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AutomationLogDocument = HydratedDocument<AutomationLog>;

export enum WorkflowType {
  HEALTH_SCANNER = 'health_scanner',
  AUTO_REMEDIATION = 'auto_remediation',
  RENEWAL_REMINDER = 'renewal_reminder',
  WORKFLOW_MONITOR = 'workflow_monitor',
}

export enum WorkflowExecutionStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  STUCK = 'stuck',
  RETRYING = 'retrying',
}

export enum TriggerSource {
  CRON = 'cron',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
}

@Schema({
  timestamps: true,
  collection: 'automation_logs',
})
export class AutomationLog {
  @Prop({
    type: String,
    enum: Object.values(WorkflowType),
    required: true,
    index: true,
  })
  workflowType!: WorkflowType;

  @Prop({ required: true, trim: true })
  workflowName!: string;

  @Prop({ trim: true, index: true })
  n8nWorkflowId?: string;

  @Prop({ trim: true, index: true })
  n8nExecutionId?: string;

  @Prop({
    type: String,
    enum: Object.values(TriggerSource),
    default: TriggerSource.CRON,
  })
  triggerSource!: TriggerSource;

  @Prop({
    type: String,
    enum: Object.values(WorkflowExecutionStatus),
    default: WorkflowExecutionStatus.RUNNING,
    index: true,
  })
  status!: WorkflowExecutionStatus;

  // Thống kê kết quả đợt chạy
  @Prop({ default: 0 })
  scannedDocumentsCount!: number;

  @Prop({ default: 0 })
  healthyCount!: number;

  @Prop({ default: 0 })
  warningCount!: number;

  @Prop({ default: 0 })
  criticalCount!: number;

  @Prop({ default: 0 })
  incidentsCreatedCount!: number;

  @Prop({ default: 0 })
  notificationsSentCount!: number;

  @Prop({ default: 0 })
  retryCount!: number;

  @Prop({ trim: true })
  errorDetails?: string;

  @Prop({ default: Date.now, index: true })
  startedAt!: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ min: 0 })
  durationMs?: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload?: Record<string, unknown>;
}

export const AutomationLogSchema = SchemaFactory.createForClass(AutomationLog);

AutomationLogSchema.index({ workflowType: 1, startedAt: -1 });
AutomationLogSchema.index({ status: 1, startedAt: -1 });
