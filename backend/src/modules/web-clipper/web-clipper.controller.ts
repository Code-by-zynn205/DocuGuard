import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { type ClipRequestDto, WebClipperService } from './web-clipper.service.js';

@Controller('web-clipper')
export class WebClipperController {
  constructor(private readonly webClipperService: WebClipperService) {}

  @Post('clip')
  async clip(@Body() dto: ClipRequestDto) {
    return this.webClipperService.clipAndSave(dto);
  }

  @Get('clips')
  async getClips(@Query('email') email?: string) {
    return this.webClipperService.getClippedHistory(email);
  }
}
