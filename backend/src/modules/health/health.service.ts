/**
 * health.service.ts
 *
 * Service xử lý logic kiểm tra sức khỏe hệ thống.
 *
 * GIAI ĐOẠN HIỆN TẠI:
 * Chỉ trả về thông tin cơ bản của server.
 *
 * GIAI ĐOẠN TIẾP THEO (Giai đoạn 1 trong DEVELOPMENT_ROADMAP):
 * Bổ sung kiểm tra:
 * - Kết nối MongoDB (mongoose.connection.readyState)
 * - Khả năng truy cập n8n (HTTP GET đến N8N_BASE_URL/healthz)
 *
 * XEM THÊM: docs/BACKEND_GUIDE.md
 */

import { Injectable } from '@nestjs/common';
import { appConfig } from '../../config/app.config.js';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      service: 'docuguard-backend',
      version: '0.1.0',
      environment: appConfig.nodeEnv,
      // TODO (Giai đoạn 1): Thêm kiểm tra MongoDB
      // TODO (Giai đoạn 1): Thêm kiểm tra n8n
      checks: {
        server: 'ok',
        database: 'not_checked',
        n8n: 'not_checked',
      },
    };
  }
}
