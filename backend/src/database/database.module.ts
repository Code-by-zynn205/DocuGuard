/**
 * database.module.ts
 *
 * Module kết nối MongoDB qua Mongoose và đăng ký toàn bộ Schemas cốt lõi của DocuGuard.
 */

import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { appConfig } from '../config/app.config.js';
import {
  User,
  UserSchema,
  Document,
  DocumentSchema,
  DocumentVersion,
  DocumentVersionSchema,
  Incident,
  IncidentSchema,
  Recovery,
  RecoverySchema,
  AuditLog,
  AuditLogSchema,
  AutomationLog,
  AutomationLogSchema,
  HealthSnapshot,
  HealthSnapshotSchema,
} from './schemas/index.js';

const FEATURE_SCHEMAS = [
  { name: User.name, schema: UserSchema },
  { name: Document.name, schema: DocumentSchema },
  { name: DocumentVersion.name, schema: DocumentVersionSchema },
  { name: Incident.name, schema: IncidentSchema },
  { name: Recovery.name, schema: RecoverySchema },
  { name: AuditLog.name, schema: AuditLogSchema },
  { name: AutomationLog.name, schema: AutomationLogSchema },
  { name: HealthSnapshot.name, schema: HealthSnapshotSchema },
];

@Global()
@Module({
  imports: [
    MongooseModule.forRoot(appConfig.mongoUri, {
      autoIndex: appConfig.nodeEnv !== 'production',
    }),
    MongooseModule.forFeature(FEATURE_SCHEMAS),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
