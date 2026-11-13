/**
 * health.module.ts
 *
 * Module gom Controller + Service health check.
 *
 * TRONG NESTJS, MỖI MODULE LÀ MỘT "HỘP" CHỨA:
 * - controllers: xử lý HTTP request
 * - providers:   service, repository (logic nghiệp vụ)
 * - imports:     module khác mà module này cần
 * - exports:     service để module khác dùng (nếu cần)
 */

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
