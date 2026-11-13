import { Body, Controller, Get, Put } from '@nestjs/common';
import { DocuGuardSettingsDto, SettingsService } from './settings.service.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  async updateSettings(@Body() body: Partial<DocuGuardSettingsDto>) {
    return this.settingsService.updateSettings(body);
  }
}

