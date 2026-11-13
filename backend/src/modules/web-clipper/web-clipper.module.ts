import { Module } from '@nestjs/common';
import { WebClipperController } from './web-clipper.controller.js';
import { WebClipperService } from './web-clipper.service.js';
import { N8nModule } from '../../integrations/n8n/n8n.module.js';

@Module({
  imports: [N8nModule],
  controllers: [WebClipperController],
  providers: [WebClipperService],
  exports: [WebClipperService],
})
export class WebClipperModule {}

