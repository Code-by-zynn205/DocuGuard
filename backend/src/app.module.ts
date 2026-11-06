import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { IncidentsModule } from './modules/incidents/incidents.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { N8nModule } from './integrations/n8n/n8n.module.js';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    N8nModule,
    DocumentsModule,
    IncidentsModule,
    DashboardModule,
  ],
})
export class AppModule {}
