import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RecoveryService } from './recovery.service.js';
import { appConfig } from '../../config/app.config.js';

@Controller(['recovery', 'recoveries'])
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.recoveryService.findAll({ status, search });
  }

  @Get('email-action')
  async handleEmailAction(
    @Query('token') token: string,
    @Query('action') action: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.recoveryService.handleEmailAction(token, action);
      const isApproved = result.status === 'completed';
      const title = result.alreadyProcessed
        ? 'Yêu cầu này đã được xử lý trước đó'
        : isApproved
          ? 'Đã phê duyệt & khôi phục tài liệu thành công!'
          : 'Đã từ chối yêu cầu khôi phục';

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`
        <!doctype html>
        <html lang="vi">
          <body style="font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc;padding:40px;text-align:center;">
            <div style="max-width:520px;margin:auto;background:#1e293b;padding:32px;border-radius:16px;border:1px solid #334155;">
              <h2 style="margin-top:0;color:${isApproved ? '#34d399' : '#fb7185'};">${title}</h2>
              <p>Mã yêu cầu: <b>${result.recovery.recoveryCode}</b></p>
              <p>Tài liệu: <b>${result.recovery.documentTitle || result.recovery.documentId}</b></p>
              <p style="margin-top:24px;">
                <a href="${appConfig.frontendOrigin}/recovery" style="display:inline-block;padding:10px 20px;background:#0284c7;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
                  Quay lại DocuGuard Safe Recovery
                </a>
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`<h3>Lỗi xử lý liên kết: ${error?.message || 'Không hợp lệ'}</h3>`);
    }
  }

  @Post('request')
  async createRequest(
    @Body() body: { documentId: string; reason?: string; approverEmail?: string },
  ) {
    return this.recoveryService.createApprovalRequest(body);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.recoveryService.findOne(id);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body('approvalNotes') approvalNotes?: string,
  ) {
    return this.recoveryService.approve(id, approvalNotes);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('approvalNotes') approvalNotes?: string,
  ) {
    return this.recoveryService.reject(id, approvalNotes);
  }
}

