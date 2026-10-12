/**
 * n8n.client.ts
 *
 * Client tích hợp với n8n — nơi backend gọi webhook/API của n8n.
 *
 * TRÁCH NHIỆM:
 * - Cung cấp các method để trigger workflow n8n.
 * - Xác thực request bằng N8N_WEBHOOK_SECRET.
 * - Xử lý lỗi khi n8n không phản hồi.
 *
 * GIAI ĐOẠN HIỆN TẠI:
 * Chỉ khai báo cấu trúc, chưa có workflow thực tế.
 *
 * SAU KHI TẠO WORKFLOW N8N:
 * Bổ sung method tương ứng tại đây.
 * Xem: docs/N8N_INTEGRATION_GUIDE.md
 *
 * VÍ DỤ SỬ DỤNG (sau khi triển khai):
 * await n8nClient.triggerDocumentScan(documentId);
 * await n8nClient.triggerIncidentWorkflow(incidentData);
 */

import { Injectable, Logger } from '@nestjs/common';
import { appConfig } from '../../config/app.config.js';

@Injectable()
export class N8nClient {
  private readonly logger = new Logger(N8nClient.name);
  private readonly baseUrl = appConfig.n8nBaseUrl;
  private readonly secret = appConfig.n8nWebhookSecret;

  /**
   * Tạo header xác thực cho mọi request đến n8n.
   * n8n Webhook Node cần được cấu hình để kiểm tra header này.
   */
  private getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-DocuGuard-Secret': this.secret,
    };
  }

  /**
   * TODO (Giai đoạn 5): Trigger workflow quét sức khỏe tài liệu.
   * @param payload Dữ liệu gửi kèm đến n8n
   */
  async triggerHealthScan(payload: Record<string, unknown>): Promise<void> {
    // Sau khi tạo webhook trong n8n, thay thế URL bên dưới
    const webhookUrl = `${this.baseUrl}/webhook/document-health-scan`;
    this.logger.log(`Triggering health scan: ${webhookUrl}`);
    // TODO: Implement HTTP POST với fetch hoặc axios
    throw new Error('Chưa triển khai. Xem docs/N8N_INTEGRATION_GUIDE.md');
  }

  /**
   * TODO (Giai đoạn 6): Trigger workflow xử lý sự cố.
   */
  async triggerIncidentWorkflow(payload: Record<string, unknown>): Promise<void> {
    const webhookUrl = `${this.baseUrl}/webhook/incident-resolution`;
    this.logger.log(`Triggering incident workflow: ${webhookUrl}`);
    throw new Error('Chưa triển khai. Xem docs/N8N_INTEGRATION_GUIDE.md');
  }

  /**
   * TODO (Giai đoạn 7): Trigger workflow khôi phục tài liệu an toàn.
   */
  async triggerSafeRecovery(payload: Record<string, unknown>): Promise<void> {
    const webhookUrl = `${this.baseUrl}/webhook/safe-recovery`;
    this.logger.log(`Triggering safe recovery: ${webhookUrl}`);
    throw new Error('Chưa triển khai. Xem docs/N8N_INTEGRATION_GUIDE.md');
  }
}
