/**
 * http-exception.filter.ts
 *
 * Exception Filter toàn cục — bắt tất cả HttpException và định dạng
 * lại response lỗi theo chuẩn thống nhất của DocuGuard.
 *
 * RESPONSE LỖI SẼ CÓ DẠNG:
 * {
 *   "success": false,
 *   "statusCode": 404,
 *   "message": "Không tìm thấy tài liệu",
 *   "timestamp": "2026-10-12T16:00:00.000Z",
 *   "path": "/api/documents/abc123"
 * }
 *
 * CÁCH ĐĂNG KÝ TOÀN CỤC (trong main.ts):
 * app.useGlobalFilters(new HttpExceptionFilter());
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message ?? exception.message;

    this.logger.warn(`[${request.method}] ${request.url} → ${status}`);

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
