/**
 * database.module.ts
 *
 * Module kết nối MongoDB bằng Mongoose.
 *
 * ⚠️  CHƯA HOẠT ĐỘNG — Cần cài thư viện trước (Giai đoạn 1):
 *     npm install @nestjs/mongoose mongoose
 *
 * SAU KHI CÀI:
 * 1. Uncomment toàn bộ code trong file này.
 * 2. Uncomment import DatabaseModule trong app.module.ts.
 *
 * CÁCH HOẠT ĐỘNG:
 * MongooseModule.forRoot() thiết lập một connection pool toàn cục.
 * Các module khác dùng MongooseModule.forFeature() để đăng ký Schema.
 *
 * ĐỌC THÊM: docs/MONGODB_GUIDE.md
 */

import { Module } from '@nestjs/common';
import { appConfig } from '../config/app.config.js';

// TODO (Giai đoạn 1): Sau khi chạy `npm install @nestjs/mongoose mongoose`
// hãy thay thế toàn bộ file này bằng code bên dưới:
//
// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { appConfig } from '../config/app.config.js';
//
// @Module({
//   imports: [
//     MongooseModule.forRoot(appConfig.mongoUri, {
//       autoIndex: appConfig.nodeEnv !== 'production',
//     }),
//   ],
//   exports: [MongooseModule],
// })
// export class DatabaseModule {}

@Module({})
export class DatabaseModule {
  constructor() {
    console.warn(
      '[DatabaseModule] ⚠️  Chưa kết nối MongoDB. ' +
      'Chạy: npm install @nestjs/mongoose mongoose ' +
      'Xem: docs/MONGODB_GUIDE.md',
    );
  }
}
