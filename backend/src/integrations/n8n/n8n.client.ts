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
  private async postWebhook(
    endpointPath: string,
    payload: Record<string, unknown>,
    timeoutMs = 25_000,
  ): Promise<boolean> {
    const urlsToTry = [
      `${this.baseUrl}/webhook/${endpointPath}`,
      `${this.baseUrl}/webhook-test/${endpointPath}`,
    ];

    for (let i = 0; i < urlsToTry.length; i += 1) {
      const url = urlsToTry[i];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (response.ok) {
          this.logger.log(`[n8n] Gửi webhook thành công tới: ${url}`);
          return true;
        }

        const errSnippet = (await response.text().catch(() => '')).slice(0, 200);
        // Chỉ fallback sang /webhook-test khi production webhook trả 404 (chưa Publish/Active)
        if (response.status !== 404 || i === urlsToTry.length - 1) {
          this.logger.warn(
            `[n8n] Webhook ${url} phản hồi HTTP ${response.status}: ${errSnippet}`,
          );
          return false;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          this.logger.warn(`[n8n] Webhook ${url} quá thời gian chờ (${timeoutMs}ms)`);
          return false;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    this.logger.warn(
      `[n8n] Không kết nối được webhook: ${endpointPath} tại ${this.baseUrl} (n8n có thể chưa active workflow này)`,
    );
    return false;
  }

  /**
   * Trigger workflow quét sức khỏe tài liệu
   */
  async triggerHealthScan(payload: Record<string, unknown>): Promise<boolean> {
    return this.postWebhook('document-health-scan', payload);
  }

  /**
   * Trigger workflow điều phối xử lý sự cố tự động
   */
  async triggerIncidentWorkflow(payload: Record<string, unknown>): Promise<boolean> {
    return this.postWebhook('incident-resolution', payload);
  }

  /**
   * Trigger workflow khôi phục an toàn
   */
  async triggerSafeRecovery(payload: Record<string, unknown>): Promise<boolean> {
    return this.postWebhook('safe-recovery', payload);
  }

  /**
   * Trigger workflow Smart Web Clipper (Google / Facebook)
   */
  async triggerWebClipper(payload: Record<string, unknown>): Promise<boolean> {
    return this.postWebhook('web-clipper', payload);
  }

  /**
   * Trigger workflow Phân loại PDF & Chuẩn hóa tên file AI
   */
  async triggerPdfClassify(payload: Record<string, unknown>): Promise<boolean> {
    return this.postWebhook('pdf-classify-rename', payload);
  }

  /**
   * Trigger workflow Kế toán AI Bóc tách & Kiểm toán Hóa đơn
   */
  async triggerInvoiceAudit(payload: Record<string, unknown>): Promise<boolean> {
    return this.postWebhook('invoice-audit', payload);
  }
}
