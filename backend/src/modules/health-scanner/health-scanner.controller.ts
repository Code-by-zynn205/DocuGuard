import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { HealthScannerService } from './health-scanner.service.js';

@Controller('health-scanner')
export class HealthScannerController {
  constructor(private readonly healthScannerService: HealthScannerService) {}

  @Get()
  async getAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.healthScannerService.getResults({ status, search });
  }

  @Get('results')
  async getResults(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.healthScannerService.getResults({ status, search });
  }

  @Get('summary')
  async getSummary() {
    return this.healthScannerService.getSummary();
  }

  @Post('scan')
  async triggerScan(@Body('triggerSource') triggerSource?: string) {
    return this.healthScannerService.runFullScan(triggerSource || 'manual');
  }
}

