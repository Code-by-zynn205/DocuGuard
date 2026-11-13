import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Document } from './document.schema.js';

export type HealthSnapshotDocument = HydratedDocument<HealthSnapshot>;

@Schema({ _id: false })
export class RiskRadarItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Document.name,
    required: true,
  })
  documentId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  department!: string;

  @Prop({ required: true })
  healthScore!: number;

  @Prop({ required: true })
  primaryRiskReason!: string; // Vd: 'Lệch mã SHA-256 (Tập tin bị sửa trái phép)'
}

export const RiskRadarItemSchema = SchemaFactory.createForClass(RiskRadarItem);

@Schema({
  timestamps: true,
  collection: 'health_snapshots',
})
export class HealthSnapshot {
  @Prop({
    type: Date,
    required: true,
    unique: true,
    index: true,
  })
  snapshotDate!: Date; // Ngày snapshot (lưu dạng YYYY-MM-DD 00:00:00)

  @Prop({ required: true, min: 0, max: 100 })
  overallHealthScore!: number; // Điểm sức khỏe trung bình toàn kho (0-100)

  @Prop({ required: true, default: 0 })
  totalDocuments!: number;

  @Prop({ required: true, default: 0 })
  healthyDocuments!: number;

  @Prop({ required: true, default: 0 })
  warningDocuments!: number;

  @Prop({ required: true, default: 0 })
  criticalDocuments!: number;

  @Prop({ required: true, default: 0 })
  openIncidents!: number;

  @Prop({ required: true, default: 0 })
  expiringIn30DaysDocuments!: number;

  @Prop({ type: [RiskRadarItemSchema], default: [] })
  topRiskRadar!: RiskRadarItem[]; // Danh sách tài liệu rủi ro cao nhất cần can thiệp
}

export const HealthSnapshotSchema = SchemaFactory.createForClass(HealthSnapshot);

HealthSnapshotSchema.index({ snapshotDate: -1 });
