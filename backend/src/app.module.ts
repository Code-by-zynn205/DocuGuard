/**
 * app.module.ts
 *
 * Module gốc của ứng dụng NestJS — nơi tất cả module được tập hợp.
 *
 * HIỆN TẠI CHỈ IMPORT:
 * - HealthModule: để endpoint /health hoạt động ngay.
 *
 * SAU NÀY THÊM THEO TỪNG GIAI ĐOẠN:
 * - DatabaseModule  → Giai đoạn 1: sau khi cài @nestjs/mongoose
 * - N8nModule       → Giai đoạn 5: khi bắt đầu tích hợp n8n
 * - DocumentsModule → Giai đoạn 2: khi xây dựng quản lý tài liệu
 * - ... (xem DEVELOPMENT_ROADMAP.md)
 *
 * LƯU Ý VỀ ESM:
 * Dự án dùng "type": "module" → mọi import nội bộ phải có .js extension.
 */

import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
