import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GoogleWorkspaceService } from './google-workspace.service.js';

@Controller('google')
export class GoogleController {
  constructor(private readonly googleService: GoogleWorkspaceService) {}

  @Get('status')
  async getStatus(@Query('email') email?: string) {
    return this.googleService.getStatus({ email });
  }

  @Get('drive/files')
  async listDriveFiles(@Query('email') email?: string) {
    return this.googleService.listDriveFiles({ email });
  }

  @Post('drive/sync')
  async syncDrive(@Body('email') email?: string) {
    return this.googleService.syncUserDrive({ email });
  }

  @Post('gmail/test')
  async sendTestEmail(@Body('email') email?: string) {
    return this.googleService.sendGmail({
      toEmail: email,
      subject: '[DocuGuard] Kiểm tra kết nối Gmail Alert & Safe Recovery',
      htmlBody:
        '<h3>Kết nối Gmail thành công!</h3><p>Hệ thống DocuGuard đã sẵn sàng gửi cảnh báo toàn vẹn SHA-256 và phê duyệt 1-click qua Gmail của bạn.</p>',
    });
  }

  @Post('gmail/send')
  async sendEmail(
    @Body() body: { toEmail?: string; subject: string; htmlBody: string },
  ) {
    return this.googleService.sendGmail({
      toEmail: body.toEmail,
      subject: body.subject,
      htmlBody: body.htmlBody,
    });
  }
}

