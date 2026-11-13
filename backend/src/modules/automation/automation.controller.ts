import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AutomationService } from './automation.service.js';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get()
  async findAll() {
    return this.automationService.findAll();
  }

  @Get('workflows')
  async findWorkflows() {
    return this.automationService.findAll();
  }

  @Patch(':id')
  async toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.automationService.toggleActive(id, isActive);
  }

  @Post(':id/trigger')
  async trigger(
    @Param('id') id: string,
    @Body('triggerSource') triggerSource?: string,
  ) {
    return this.automationService.triggerWorkflow(id, triggerSource || 'manual');
  }
}

