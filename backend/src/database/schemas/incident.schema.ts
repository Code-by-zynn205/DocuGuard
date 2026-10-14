import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Document } from './document.schema.js';
import { User } from './user.schema.js';

export type IncidentDocument = HydratedDocument<Incident>;

export enum IncidentSeverity {
  LOW = 'low', // Thiếu tag/metadata không bắt buộc
  MEDIUM = 'medium', // Sắp hết hạn (30 ngày)
  HIGH = 'high', // Đã hết hạn, thiếu phụ lục
  CRITICAL = 'critical', // File bị thay đổi trái phép (mã hash lệch) hoặc tệp biến mất
}

export enum IncidentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IncidentType {
  INTEGRITY_VIOLATION = 'integrity_violation', // Mã hash lệch
  MISSING_FILE = 'missing_file', // Tệp biến mất khỏi storage
  EXPIRED = 'expired', // Tài liệu hết hạn
  EXPIRING_SOON = 'expiring_soon', // Sắp hết hạn trong 30 ngày
  DUPLICATE = 'duplicate', // Tài liệu trùng lặp
  MISSING_APPENDIX = 'missing_appendix', // Thiếu phụ lục bắt buộc
  LOW_HEALTH_SCORE = 'low_health_score', // Điểm sức khỏe tụt dưới ngưỡng
  WORKFLOW_FAILURE = 'workflow_failure', // Workflow n8n bị lỗi hoặc kẹt
}

@Schema({ _id: false })
export class IncidentTimelineEntry {
  @Prop({ required: true })
  action!: string; // e.g. 'CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'COMMENT_ADDED', 'RECOVERED'

  @Prop({ required: true })
  note!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name })
  performedBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  timestamp!: Date;
}

export const IncidentTimelineEntrySchema = SchemaFactory.createForClass(IncidentTimelineEntry);

@Schema({
  timestamps: true,
  collection: 'incidents',
})
export class Incident {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    index: true,
  })
  incidentCode!: string; // Vd: INC-202610-0001

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Document.name,
    index: true,
  })
  documentId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({
    type: String,
    enum: Object.values(IncidentType),
    required: true,
    index: true,
  })
  type!: IncidentType;

  @Prop({
    type: String,
    enum: Object.values(IncidentSeverity),
    required: true,
    index: true,
  })
  severity!: IncidentSeverity;

  @Prop({
    type: String,
    enum: Object.values(IncidentStatus),
    default: IncidentStatus.OPEN,
    index: true,
  })
  status!: IncidentStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    index: true,
  })
  assignedTo?: Types.ObjectId; // Nhân sự chịu trách nhiệm xử lý

  // SLA Tracking
  @Prop({ type: Date, index: true })
  slaDeadline?: Date; // Hạn chót xử lý theo cam kết SLA

  @Prop({ default: false, index: true })
  slaBreached!: boolean; // Bị trễ hạn SLA

  // n8n Workflow Automation Reference
  @Prop({ trim: true })
  n8nWorkflowId?: string;

  @Prop({ trim: true })
  n8nExecutionId?: string;

  // Xử lý sự cố
  @Prop({ trim: true })
  resolutionNotes?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name })
  resolvedBy?: Types.ObjectId;

  @Prop({ type: [IncidentTimelineEntrySchema], default: [] })
  timeline!: IncidentTimelineEntry[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata!: Record<string, unknown>;
}

export const IncidentSchema = SchemaFactory.createForClass(Incident);

// Composite Indexes
IncidentSchema.index({ status: 1, severity: 1 });
IncidentSchema.index({ assignedTo: 1, status: 1 });
IncidentSchema.index({ documentId: 1, status: 1 });
IncidentSchema.index({ slaDeadline: 1, status: 1 });
