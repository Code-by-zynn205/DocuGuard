import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller.js';
import { AutomationService } from './automation.service.js';
import { N8nModule } from '../../integrations/n8n/n8n.module.js';
import { HealthScannerModule } from '../health-scanner/health-scanner.module.js';

@Module({
  imports: [N8nModule, HealthScannerModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}

