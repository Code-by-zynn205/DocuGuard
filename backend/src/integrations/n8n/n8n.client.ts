/**
 * n8n.client.ts
 *
 * Client tích hợp với n8n — nơi backend gọi webhook/API của n8n.
 */

import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../../config/app.config.js';

@Injectable()
export class N8nClient {
  private readonly logger = new Logger(N8nClient.name);
  private readonly baseUrl = appConfig.n8nBaseUrl;
  private readonly secret = appConfig.n8nWebhookSecret;

  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-DocuGuard-Secret': this.secret,
    };
  }

  /**
   * Gọi webhook n8n với cơ chế timeout an toàn, không làm nghẽn luồng chính
   */
  private async postWebhook(endpointPath: string, payload: Record<string, unknown>): Promise<boolean> {
    const urlsToTry = [
      `${this.baseUrl}/webhook/${endpointPath}`,
      `${this.baseUrl}/webhook-test/${endpointPath}`,
    ];

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          this.logger.log(`[n8n] Gửi webhook thành công tới: ${url}`);
          return true;
        }
      } catch (err: any) {
        // Tiếp tục thử URL tiếp theo nếu URL đầu tiên không phản hồi
      }
    }

    this.logger.warn(`[n8n] Không kết nối được webhook: ${endpointPath} tại ${this.baseUrl} (n8n có thể chưa active workflow này)`);
    return false;
  }

  /**
   * Trigger workflow quét sức khỏe tài liệu
   */
  async triggerHealthScan(payload: Record<string, unknown>): Promise<void> {
    await this.postWebhook('document-health-scan', payload);
  }

  /**
   * Trigger workflow điều phối xử lý sự cố tự động
   */
  async triggerIncidentWorkflow(payload: Record<string, unknown>): Promise<void> {
    await this.postWebhook('incident-resolution', payload);
  }

  /**
   * Trigger workflow khôi phục an toàn
   */
  async triggerSafeRecovery(payload: Record<string, unknown>): Promise<void> {
    await this.postWebhook('safe-recovery', payload);
  }
}
