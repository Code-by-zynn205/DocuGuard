import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { IncidentsService } from './incidents.service.js';
import { CreateIncidentDto, UpdateIncidentStatusDto } from './dto/create-incident.dto.js';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  async create(@Body() dto: CreateIncidentDto) {
    return this.incidentsService.create(dto);
  }

  @Get('summary')
  async getSummary() {
    return this.incidentsService.getSummary();
  }

  @Get()
  async findAll(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.incidentsService.findAll({ severity, status, type });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    return this.incidentsService.updateStatus(id, dto);
  }
}
