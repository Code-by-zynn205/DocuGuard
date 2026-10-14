import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './user.schema.js';

export type DocumentDocument = HydratedDocument<Document>;

export enum DocumentStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum IntegrityStatus {
  INTACT = 'intact',
  TAMPERED = 'tampered',
  MISSING = 'missing',
}

export enum DocumentCategory {
  CONTRACT = 'contract',
  FINANCIAL = 'financial',
  HR = 'hr',
  LEGAL = 'legal',
  TECHNICAL = 'technical',
  OPERATIONAL = 'operational',
  OTHER = 'other',
}

@Schema({ _id: false })
export class HealthDeduction {
  @Prop({ required: true })
  rule!: string; // e.g. 'MISSING_DESCRIPTION', 'EXPIRED', 'INTEGRITY_TAMPERED', 'MISSING_APPENDIX'

  @Prop({ required: true })
  reason!: string;

  @Prop({ required: true })
  pointsDeducted!: number;

  @Prop({ default: Date.now })
  detectedAt!: Date;
}

export const HealthDeductionSchema = SchemaFactory.createForClass(HealthDeduction);

@Schema({ _id: false })
export class RenewalRemindersSent {
  @Prop({ default: false })
  day30!: boolean;

  @Prop({ default: false })
  day15!: boolean;

  @Prop({ default: false })
  day7!: boolean;
}

export const RenewalRemindersSentSchema = SchemaFactory.createForClass(RenewalRemindersSent);

@Schema({
  timestamps: true,
  collection: 'documents',
})
export class Document {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, trim: true })
  originalFileName!: string;

  @Prop({ required: true })
  filePath!: string; // Đường dẫn vật lý lưu trong Docker volume (storage/documents)

  @Prop({ required: true })
  backupFilePath!: string; // Đường dẫn vùng backup bảo mật để Safe Recovery 1-click

  @Prop({ required: true })
  backupHash!: string; // SHA-256 fingerprint của file sao lưu gốc

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true, min: 0 })
  fileSize!: number; // Kích thước tính theo byte

  @Prop({ required: true, index: true })
  fileHash!: string; // SHA-256 digital fingerprint hiện tại

  @Prop({
    type: String,
    enum: Object.values(DocumentCategory),
    default: DocumentCategory.OTHER,
    index: true,
  })
  category!: DocumentCategory;

  @Prop({ required: true, trim: true, index: true })
  department!: string; // Phòng ban sở hữu (Kế toán, Pháp chế, Nhân sự...)

  @Prop({ type: Date })
  issueDate?: Date; // Ngày ban hành

  @Prop({ type: Date, index: true })
  expiresAt?: Date; // Ngày hết hạn

  @Prop({
    type: String,
    enum: Object.values(DocumentStatus),
    default: DocumentStatus.ACTIVE,
    index: true,
  })
  status!: DocumentStatus;

  @Prop({ default: false, index: true })
  isConfidential!: boolean; // Tài liệu tối mật: cần Trưởng phòng duyệt mới cho khôi phục

  // "Bác sĩ tài liệu" & Health Metrics
  @Prop({ min: 0, max: 100, default: 100, index: true })
  healthScore!: number; // Thang điểm 0 - 100

  @Prop({
    type: String,
    enum: Object.values(HealthStatus),
    default: HealthStatus.HEALTHY,
    index: true,
  })
  healthStatus!: HealthStatus;

  @Prop({ type: [HealthDeductionSchema], default: [] })
  healthDeductions!: HealthDeduction[];

  // File Integrity Watch
  @Prop({
    type: String,
    enum: Object.values(IntegrityStatus),
    default: IntegrityStatus.INTACT,
    index: true,
  })
  integrityStatus!: IntegrityStatus;

  @Prop({ type: Date })
  lastIntegrityCheckAt?: Date;

  @Prop({ type: Date })
  lastHealthScanAt?: Date;

  @Prop({ default: false, index: true })
  isMissing!: boolean; // File vật lý có còn trên đĩa không hay đã bị xóa mất

  // Phát hiện trùng lặp (Duplicate Detection)
  @Prop({ default: false, index: true })
  isDuplicate!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Document', default: null })
  duplicateOf?: Types.ObjectId;

  @Prop({ default: 0 })
  duplicateCount!: number;

  // Kiểm tra phụ lục bắt buộc (Appendix/Attachment Checker)
  @Prop({ type: [String], default: [] })
  requiredAppendices!: string[];

  @Prop({ type: [String], default: [] })
  attachedAppendices!: string[];

  @Prop({ type: [String], default: [] })
  missingAppendices!: string[];

  @Prop({ default: false })
  hasMissingAppendix!: boolean;

  // Phiên bản hiện tại
  @Prop({ default: 1, min: 1 })
  currentVersion!: number;

  // Nhắc nhở gia hạn (Renewal Reminder Flags)
  @Prop({ type: RenewalRemindersSentSchema, default: () => ({}) })
  renewalRemindersSent!: RenewalRemindersSent;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, index: true })
  uploadedBy?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata!: Record<string, unknown>;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);

// Composite & Text Indexes for Smart Search & Radar Filter
DocumentSchema.index({ fileHash: 1, status: 1 });
DocumentSchema.index({ healthStatus: 1, healthScore: 1 });
DocumentSchema.index({ expiresAt: 1, status: 1 });
DocumentSchema.index({ department: 1, category: 1 });
DocumentSchema.index({
  title: 'text',
  description: 'text',
  originalFileName: 'text',
  department: 'text',
});
