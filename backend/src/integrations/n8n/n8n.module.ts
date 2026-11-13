/**
 * n8n.module.ts
 *
 * Module đăng ký N8nClient vào hệ thống NestJS.
 *
 * CÁCH DÙNG Ở MODULE KHÁC:
 * imports: [N8nModule]
 * → Sau đó inject N8nClient vào service của module đó.
 */

import { Module } from '@nestjs/common';
import { N8nClient } from './n8n.client.js';

@Module({
  providers: [N8nClient],
  // Export để các module nghiệp vụ (documents, incidents, ...) có thể inject
  exports: [N8nClient],
})
export class N8nModule {}
