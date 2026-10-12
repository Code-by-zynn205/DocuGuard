/**
 * health.controller.ts
 *
 * Controller kiểm tra sức khỏe hệ thống (Health Check).
 *
 * Endpoint: GET /health
 *
 * MỤC ĐÍCH:
 * - Cho phép Docker/Kubernetes biết service có đang chạy không.
 * - Cho phép frontend kiểm tra backend có sẵn sàng không.
 * - Sau này sẽ mở rộng để kiểm tra kết nối MongoDB, n8n.
 *
 * ĐỌC THÊM:
 * - docs/BACKEND_GUIDE.md để hiểu cách mở rộng health check.
 */

import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /health
   * Trả về trạng thái cơ bản của server.
   * Sau này sẽ bổ sung kiểm tra MongoDB, n8n.
   */
  @Get()
  check() {
    return this.healthService.check();
  }
}
