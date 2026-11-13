import { Module } from '@nestjs/common';
import { HealthScannerController } from './health-scanner.controller.js';
import { HealthScannerService } from './health-scanner.service.js';
import { N8nModule } from '../../integrations/n8n/n8n.module.js';

@Module({
  imports: [N8nModule],
  controllers: [HealthScannerController],
  providers: [HealthScannerService],
  exports: [HealthScannerService],
})
export class HealthScannerModule {}

