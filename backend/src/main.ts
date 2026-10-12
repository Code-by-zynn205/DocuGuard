/**
 * main.ts
 *
 * Điểm khởi động ứng dụng NestJS DocuGuard Backend.
 *
 * NHỮNG GÌ ĐƯỢC CẤU HÌNH Ở ĐÂY:
 * - Global Prefix: tất cả route bắt đầu bằng /api
 * - Global Filters: chuẩn hóa format lỗi (HttpExceptionFilter)
 * - Global Interceptors: chuẩn hóa format response (ResponseInterceptor)
 * - CORS: cho phép frontend gọi API
 *
 * SAU KHI CÀI SWAGGER (Giai đoạn 2):
 * import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
 * → Thêm cấu hình Swagger để có API docs tự động.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { appConfig } from './config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Tiền tố /api cho tất cả route (trừ /health — sẽ thành /api/health)
  app.setGlobalPrefix('api');

  // CORS: cho phép frontend gọi API từ origin được cấu hình
  app.enableCors({
    origin: appConfig.frontendOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global Exception Filter — định dạng lỗi thống nhất
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptor — bọc response thành công
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(appConfig.port, '0.0.0.0');
  console.log(`🚀 DocuGuard Backend đang chạy tại cổng ${appConfig.port}`);
  console.log(`🌍 Môi trường: ${appConfig.nodeEnv}`);
  console.log(`📡 API health check: http://localhost:${appConfig.port}/api/health`);
}

await bootstrap();
