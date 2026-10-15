/**
 * app.config.ts
 *
 * Tập trung toàn bộ cấu hình ứng dụng từ biến môi trường.
 *
 * CÁCH DÙNG:
 * import { appConfig } from '../config/app.config.js';
 * console.log(appConfig.port);
 *
 * NGUYÊN TẮC:
 * - KHÔNG hardcode giá trị nhạy cảm ở đây.
 * - Đặt giá trị mặc định an toàn cho môi trường development.
 * - Production PHẢI cung cấp đầy đủ biến môi trường.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Tự động nạp file .env khi chạy ngoài Docker
try {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
  }
} catch {
  // Bỏ qua nếu môi trường đã có sẵn biến
}

export const appConfig = {
  // Môi trường chạy: 'development' | 'production' | 'test'
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Cổng backend lắng nghe (mặc định 3001)
  port: parseInt(process.env.PORT ?? '3001', 10),

  // URI kết nối MongoDB
  // Dạng: mongodb://host:port/database
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/docuguard',

  // URL gốc của n8n (nội bộ Docker: http://n8n:5678)
  n8nBaseUrl: process.env.N8N_BASE_URL ?? 'http://localhost:5678',

  // Secret dùng để xác thực webhook từ n8n gọi vào backend
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET ?? '',

  // Origin được phép gọi API (CORS)
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',

  // Thư mục lưu trữ tệp tài liệu trên server
  documentStoragePath: process.env.DOCUMENT_STORAGE_PATH ?? './storage/documents',

  // ─── JWT ───────────────────────────────────────────────────────
  // Secret ký Access Token (phải đủ dài và ngẫu nhiên khi production)
  jwtSecret: process.env.JWT_SECRET ?? 'docuguard-access-secret-change-in-production',

  // Secret ký Refresh Token (dùng secret khác với Access Token)
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'docuguard-refresh-secret-change-in-production',

  // Thời gian sống Access Token (dạng string cho JwtModule: '15m', '1h', ...)
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',

  // Thời gian sống Refresh Token
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  // Thời gian sống Access Token (dạng số giây — trả về cho client)
  jwtAccessExpiresInSeconds: parseInt(process.env.JWT_ACCESS_EXPIRES_IN_SECONDS ?? '900', 10),
};

// Kiểu TypeScript của config — dùng khi cần inject vào service
export type AppConfig = typeof appConfig;
