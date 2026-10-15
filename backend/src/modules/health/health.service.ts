/**
 * health.service.ts
 *
 * Service xử lý logic kiểm tra sức khỏe hệ thống DocuGuard.
 */

import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { appConfig } from '../../config/app.config.js';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  check() {
    const isDbConnected = this.connection.readyState === 1;

    return {
      status: isDbConnected ? 'ok' : 'degraded',
      service: 'docuguard-backend',
      version: '0.1.0',
      environment: appConfig.nodeEnv,
      checks: {
        server: 'ok',
        database: isDbConnected ? 'ok' : 'disconnected',
        n8n: 'not_checked',
      },
    };
  }
}
