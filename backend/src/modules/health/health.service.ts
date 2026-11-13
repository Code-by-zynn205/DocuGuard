/**
 * health.service.ts
 *
 * Service xử lý logic kiểm tra sức khỏe hệ thống DocuGuard (Server, MongoDB, n8n).
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

  async check() {
    const isDbConnected = this.connection.readyState === 1;

    let n8nStatus = 'unreachable';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${appConfig.n8nBaseUrl}/healthz`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        n8nStatus = 'ok';
      }
    } catch {
      n8nStatus = 'unreachable';
    }

    const overallOk = isDbConnected && (n8nStatus === 'ok' || appConfig.nodeEnv === 'development');

    return {
      status: overallOk ? 'ok' : 'degraded',
      service: 'docuguard-backend',
      version: '0.1.0',
      environment: appConfig.nodeEnv,
      checks: {
        server: 'ok',
        database: isDbConnected ? 'ok' : 'disconnected',
        n8n: n8nStatus,
      },
    };
  }
}
