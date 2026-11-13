import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { IncidentsModule } from './modules/incidents/incidents.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { N8nModule } from './integrations/n8n/n8n.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { RecoveryModule } from './modules/recovery/recovery.module.js';
import { HealthScannerModule } from './modules/health-scanner/health-scanner.module.js';
import { AutomationModule } from './modules/automation/automation.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { GoogleModule } from './modules/google/google.module.js';
import { WebClipperModule } from './modules/web-clipper/web-clipper.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    HealthModule,
    AuthModule,
    N8nModule,
    GoogleModule,
    DocumentsModule,
    IncidentsModule,
    DashboardModule,
    RecoveryModule,
    HealthScannerModule,
    AutomationModule,
    SettingsModule,
    WebClipperModule,
  ],
})
export class AppModule {}
