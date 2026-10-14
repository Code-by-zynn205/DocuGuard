import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Document } from './document.schema.js';
import { Incident } from './incident.schema.js';
import { User } from './user.schema.js';

export type RecoveryDocument = HydratedDocument<Recovery>;

export enum RecoveryStatus {
  PENDING_APPROVAL = 'pending_approval', // Chờ trưởng phòng phê duyệt (tài liệu tối mật)
  APPROVED = 'approved', // Đã duyệt
  REJECTED = 'rejected', // Từ chối duyệt
  EXECUTING = 'executing', // Đang tiến hành sao chép ghi đè
  COMPLETED = 'completed', // Khôi phục thành công 100%
  FAILED = 'failed', // Thất bại
}

@Schema({
  timestamps: true,
  collection: 'recoveries',
})
export class Recovery {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Document.name,
    required: true,
    index: true,
  })
  documentId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Incident.name,
    index: true,
  })
  incidentId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(RecoveryStatus),
    default: RecoveryStatus.COMPLETED,
    index: true,
  })
  status!: RecoveryStatus;

  @Prop({ required: true, trim: true })
  reason!: string; // Lý do thực hiện khôi phục

  @Prop({ required: true })
  sourceBackupPath!: string; // Đường dẫn file nguồn trong vùng sao lưu an toàn

  @Prop({ required: true })
  sourceBackupHash!: string; // Mã SHA-256 gốc cần đưa về

  @Prop({ trim: true })
  corruptedFileHash?: string; // Mã SHA-256 lúc bị xâm nhập/hỏng

  @Prop({ default: false, index: true })
  isConfidentialDocument!: boolean; // Cần approval workflow hay không

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  requestedBy!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    index: true,
  })
  approvedBy?: Types.ObjectId;

  @Prop({ trim: true })
  approvalToken?: string; // Secret token để trưởng phòng bấm duyệt nhanh từ email/n8n

  @Prop({ trim: true })
  approvalNotes?: string;

  @Prop({ type: Date })
  approvalRequestedAt?: Date;

  @Prop({ type: Date })
  approvalDecisionAt?: Date;

  @Prop({ type: Date })
  restoredAt?: Date;

  @Prop({ trim: true })
  errorMessage?: string;
}

export const RecoverySchema = SchemaFactory.createForClass(Recovery);

RecoverySchema.index({ documentId: 1, status: 1 });
RecoverySchema.index({ approvalToken: 1 });
