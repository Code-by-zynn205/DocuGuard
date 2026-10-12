/**
 * types/index.ts
 *
 * Khai báo tập trung các kiểu TypeScript dùng trong frontend.
 *
 * NGUYÊN TẮC:
 * - Kiểu này phản ánh cấu trúc dữ liệu từ API backend.
 * - Khi backend thay đổi schema, cập nhật ở đây trước.
 * - Mỗi module lớn nên có file types riêng trong thư mục types/.
 *
 * GHI CHÚ:
 * Đây là khai báo sơ bộ, sẽ mở rộng trong từng giai đoạn triển khai.
 * Xem DEVELOPMENT_ROADMAP.md để biết thứ tự.
 */

// ─────────────────────────────────────────────────────────────
// TRẠNG THÁI SỨC KHỎE TÀI LIỆU
// ─────────────────────────────────────────────────────────────

/** Điểm sức khỏe: 0–100 */
export type HealthScore = number;

/** Mức độ sức khỏe tổng quát */
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

// ─────────────────────────────────────────────────────────────
// TÀI LIỆU (Document)
// Sẽ mở rộng trong Giai đoạn 2
// ─────────────────────────────────────────────────────────────

export interface Document {
  _id: string;
  title: string;
  description?: string;
  fileHash?: string;       // SHA-256 — dùng cho File Integrity Watch
  mimeType?: string;
  fileSize?: number;
  status: 'active' | 'archived' | 'deleted';
  healthScore?: HealthScore;
  healthStatus?: HealthStatus;
  expiresAt?: string;      // ISO 8601
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// SỰ CỐ (Incident)
// Sẽ mở rộng trong Giai đoạn 6
// ─────────────────────────────────────────────────────────────

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Incident {
  _id: string;
  documentId?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// Sẽ mở rộng trong Giai đoạn 8
// ─────────────────────────────────────────────────────────────

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD SUMMARY
// Sẽ mở rộng trong Giai đoạn 9
// ─────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalDocuments: number;
  healthyDocuments: number;
  warningDocuments: number;
  criticalDocuments: number;
  openIncidents: number;
  expiringDocuments: number;
  overallHealthScore: HealthScore;
}
