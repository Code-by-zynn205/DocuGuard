import { Global, Module } from '@nestjs/common';
import { GoogleController } from './google.controller.js';
import { GoogleWorkspaceService } from './google-workspace.service.js';
import { N8nModule } from '../../integrations/n8n/n8n.module.js';

@Global()
@Module({
  imports: [N8nModule],
  controllers: [GoogleController],
  providers: [GoogleWorkspaceService],
  exports: [GoogleWorkspaceService],
})
export class GoogleModule {}

