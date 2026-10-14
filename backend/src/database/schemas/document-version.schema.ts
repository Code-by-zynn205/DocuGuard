import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Document } from './document.schema.js';
import { User } from './user.schema.js';

export type DocumentVersionDocument = HydratedDocument<DocumentVersion>;

@Schema({
  timestamps: true,
  collection: 'document_versions',
})
export class DocumentVersion {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Document.name,
    required: true,
    index: true,
  })
  documentId!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  versionNumber!: number; // v1, v2, v3...

  @Prop({ required: true, trim: true })
  originalFileName!: string;

  @Prop({ required: true })
  filePath!: string;

  @Prop({ required: true, index: true })
  fileHash!: string; // SHA-256 fingerprint

  @Prop({ required: true, min: 0 })
  fileSize!: number;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ trim: true })
  changeReason?: string; // Lý do cập nhật phiên bản mới

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, index: true })
  uploadedBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  snapshotMetadata?: Record<string, unknown>;
}

export const DocumentVersionSchema = SchemaFactory.createForClass(DocumentVersion);

// Đảm bảo không trùng version cho cùng 1 document
DocumentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });
DocumentVersionSchema.index({ documentId: 1, createdAt: -1 });
