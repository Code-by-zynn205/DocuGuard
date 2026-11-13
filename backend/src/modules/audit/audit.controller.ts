import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service.js';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      entityType,
      action,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('recent')
  async findRecent(@Query('limit') limit?: string) {
    return this.auditService.findRecent(limit ? parseInt(limit, 10) : 10);
  }

  @Get('entity/:type/:id')
  async findByEntity(@Param('type') type: string, @Param('id') id: string) {
    return this.auditService.findByEntity(type, id);
  }
}

