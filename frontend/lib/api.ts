/**
 * lib/api.ts
 *
 * Type-Safe API Client cho DocuGuard Frontend (Next.js 16 App Router).
 *
 * TÍNH NĂNG:
 * - Kết nối backend qua process.env.NEXT_PUBLIC_API_URL (mặc định http://localhost:3001).
 * - Hỗ trợ Bearer Token (lưu trữ an toàn trên client + truyền theo từng request).
 * - Xử lý lỗi tập trung qua ApiException & normalizeApiError.
 * - Tích hợp sẵn Mock Fallback Data để frontend chạy độc lập khi chưa bật backend.
 */

import { AUTH_TOKEN_STORAGE_KEY } from "@/constants";
import type {
  AuditLog,
  AutomationWorkflow,
  DashboardSummary,
  Document,
  HealthScanResult,
  HealthScanSummary,
  Incident,
  RecoveryPoint,
  SystemHealthCheck,
} from "@/types";

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");
const FORCE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const DEFAULT_TIMEOUT_MS = 10_000;

// ─────────────────────────────────────────────────────────────
// RESPONSE & ERROR TYPES
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  isMock?: boolean;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string | string[];
  timestamp?: string;
  path?: string;
}

export type QueryParamValue = string | number | boolean | undefined | null;

export interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  params?: Record<string, QueryParamValue>;
  token?: string;
  timeoutMs?: number;
  mockFallback?: boolean;
}

export class ApiException extends Error {
  public readonly statusCode: number;
  public readonly path?: string;
  public readonly timestamp?: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    options?: { path?: string; timestamp?: string; details?: unknown },
  ) {
    super(message);
    this.name = "ApiException";
    this.statusCode = statusCode;
    this.path = options?.path;
    this.timestamp = options?.timestamp;
    this.details = options?.details;
  }
}

export function normalizeApiError(error: unknown): string {
  if (error instanceof ApiException) {
    return error.message;
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "Yêu cầu quá thời gian phản hồi từ máy chủ.";
    }
    return error.message || "Đã xảy ra lỗi không xác định.";
  }
  return "Đã xảy ra lỗi kết nối đến máy chủ.";
}

// ─────────────────────────────────────────────────────────────
// BEARER TOKEN MANAGEMENT
// ─────────────────────────────────────────────────────────────

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) {
    return inMemoryToken;
  }
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  }
  return null;
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

// ─────────────────────────────────────────────────────────────
// MOCK FALLBACK DATA (CHẠY ĐỘC LẬP KHI CHƯA BẬT BACKEND)
// ─────────────────────────────────────────────────────────────

const MOCK_DOCUMENTS: Document[] = [
  {
    _id: "doc_001",
    title: "Hợp đồng cung cấp hạ tầng Cloud 2026",
    description: "Hợp đồng khung dịch vụ hạ tầng máy chủ và bảo mật SOC.",
    originalFileName: "HD_Cloud_Infrastructure_2026.pdf",
    filePath: "/storage/documents/1731390000_HD_Cloud_Infrastructure_2026.pdf",
    backupFilePath:
      "/storage/backups/1731390000_HD_Cloud_Infrastructure_2026.pdf.backup",
    backupHash:
      "8f4e2b91c3a04d7e6f1234567890abcdef1234567890abcdef1234567890abcd",
    mimeType: "application/pdf",
    fileSize: 2_458_624,
    fileHash:
      "8f4e2b91c3a04d7e6f1234567890abcdef1234567890abcdef1234567890abcd",
    category: "contract",
    department: "Pháp chế",
    issueDate: "2026-01-15T00:00:00.000Z",
    expiresAt: "2027-01-15T00:00:00.000Z",
    status: "active",
    isConfidential: true,
    healthScore: 96,
    healthStatus: "healthy",
    healthDeductions: [],
    integrityStatus: "intact",
    lastIntegrityCheckAt: "2026-11-12T08:00:00.000Z",
    lastHealthScanAt: "2026-11-12T08:00:00.000Z",
    isMissing: false,
    isDuplicate: false,
    duplicateCount: 0,
    requiredAppendices: ["Phụ lục SLA", "Phụ lục Bảo mật NDA"],
    attachedAppendices: ["Phụ lục SLA", "Phụ lục Bảo mật NDA"],
    missingAppendices: [],
    hasMissingAppendix: false,
    currentVersion: 2,
    renewalRemindersSent: { day30: false, day15: false, day7: false },
    tags: ["cloud", "soc", "confidential"],
    createdAt: "2026-01-15T08:30:00.000Z",
    updatedAt: "2026-11-12T08:00:00.000Z",
  },
  {
    _id: "doc_002",
    title: "Báo cáo kiểm toán an ninh thông tin Q4",
    description: "Tài liệu đánh giá tuân thủ ISO 27001 định kỳ quý IV.",
    originalFileName: "Audit_ISO27001_Q4_2026.pdf",
    filePath: "/storage/documents/1731390100_Audit_ISO27001_Q4_2026.pdf",
    backupFilePath:
      "/storage/backups/1731390100_Audit_ISO27001_Q4_2026.pdf.backup",
    backupHash:
      "a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef",
    mimeType: "application/pdf",
    fileSize: 4_120_000,
    fileHash:
      "deadbeef99999999999999999999999999999999999999999999999999999999",
    category: "legal",
    department: "An toàn thông tin",
    issueDate: "2026-10-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    status: "active",
    isConfidential: true,
    healthScore: 35,
    healthStatus: "critical",
    healthDeductions: [
      {
        rule: "INTEGRITY_TAMPERED",
        reason: "Phát hiện sai lệch mã băm SHA-256 so với bản sao lưu gốc",
        pointsDeducted: 50,
        detectedAt: "2026-11-12T07:45:00.000Z",
      },
      {
        rule: "EXPIRING_SOON",
        reason: "Tài liệu sắp hết hạn trong vòng 19 ngày tới",
        pointsDeducted: 15,
        detectedAt: "2026-11-12T07:45:00.000Z",
      },
    ],
    integrityStatus: "tampered",
    lastIntegrityCheckAt: "2026-11-12T07:45:00.000Z",
    lastHealthScanAt: "2026-11-12T07:45:00.000Z",
    isMissing: false,
    isDuplicate: false,
    duplicateCount: 0,
    requiredAppendices: ["Biên bản nghiệm thu"],
    attachedAppendices: ["Biên bản nghiệm thu"],
    missingAppendices: [],
    hasMissingAppendix: false,
    currentVersion: 1,
    renewalRemindersSent: { day30: true, day15: false, day7: false },
    tags: ["iso27001", "audit", "critical"],
    createdAt: "2026-10-01T09:15:00.000Z",
    updatedAt: "2026-11-12T07:45:00.000Z",
  },
  {
    _id: "doc_003",
    title: "Quy chế lương thưởng & Bảo mật nhân sự",
    description: "Chính sách nội bộ áp dụng cho toàn bộ khối vận hành.",
    originalFileName: "HR_Compensation_Policy_2026.docx",
    filePath: "/storage/documents/1731390200_HR_Compensation_Policy_2026.docx",
    backupFilePath:
      "/storage/backups/1731390200_HR_Compensation_Policy_2026.docx.backup",
    backupHash:
      "3c7e9a1b2d4f6081a3c5e7092b4d6f8102a4c6e8013579bdf02468ace13579bd",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 980_450,
    fileHash:
      "3c7e9a1b2d4f6081a3c5e7092b4d6f8102a4c6e8013579bdf02468ace13579bd",
    category: "hr",
    department: "Nhân sự",
    issueDate: "2025-11-20T00:00:00.000Z",
    expiresAt: "2026-11-28T00:00:00.000Z",
    status: "active",
    isConfidential: false,
    healthScore: 70,
    healthStatus: "warning",
    healthDeductions: [
      {
        rule: "EXPIRING_SOON",
        reason: "Tài liệu sắp hết hạn trong vòng 16 ngày tới",
        pointsDeducted: 15,
        detectedAt: "2026-11-12T07:45:00.000Z",
      },
      {
        rule: "MISSING_APPENDIX",
        reason: "Thiếu phụ lục bắt buộc: Bảng phụ cấp khu vực",
        pointsDeducted: 15,
        detectedAt: "2026-11-12T07:45:00.000Z",
      },
    ],
    integrityStatus: "intact",
    lastIntegrityCheckAt: "2026-11-12T07:45:00.000Z",
    lastHealthScanAt: "2026-11-12T07:45:00.000Z",
    isMissing: false,
    isDuplicate: false,
    duplicateCount: 0,
    requiredAppendices: ["Bảng phụ cấp khu vực"],
    attachedAppendices: [],
    missingAppendices: ["Bảng phụ cấp khu vực"],
    hasMissingAppendix: true,
    currentVersion: 3,
    renewalRemindersSent: { day30: true, day15: true, day7: false },
    tags: ["hr", "policy"],
    createdAt: "2025-11-20T10:00:00.000Z",
    updatedAt: "2026-11-12T07:45:00.000Z",
  },
];

const MOCK_INCIDENTS: Incident[] = [
  {
    _id: "inc_001",
    incidentCode: "INC-202611-0042",
    documentId: MOCK_DOCUMENTS[1],
    title: "Phát hiện sai lệch SHA-256: Báo cáo kiểm toán an ninh thông tin Q4",
    description:
      "File Integrity Watcher phát hiện mã băm thực tế khác với bản sao lưu bảo mật.",
    type: "integrity_violation",
    severity: "critical",
    status: "open",
    slaDeadline: "2026-11-12T10:00:00.000Z",
    slaBreached: false,
    n8nWorkflowId: "wf_auto_remediation_01",
    n8nExecutionId: "exec_98123",
    timeline: [
      {
        action: "CREATED",
        note: "Tự động khởi tạo từ Health Scanner & File Integrity Watcher",
        timestamp: "2026-11-12T07:45:00.000Z",
      },
    ],
    createdAt: "2026-11-12T07:45:00.000Z",
    updatedAt: "2026-11-12T07:45:00.000Z",
  },
  {
    _id: "inc_002",
    incidentCode: "INC-202611-0041",
    documentId: MOCK_DOCUMENTS[2],
    title: "Tài liệu sắp hết hạn (16 ngày): Quy chế lương thưởng & Bảo mật",
    description: "Cần gia hạn hoặc phê duyệt phiên bản mới trước 28/11/2026.",
    type: "expiring_soon",
    severity: "medium",
    status: "in_progress",
    slaDeadline: "2026-11-15T17:00:00.000Z",
    slaBreached: false,
    timeline: [
      {
        action: "CREATED",
        note: "Cảnh báo gia hạn từ n8n Renewal Reminder",
        timestamp: "2026-11-11T08:00:00.000Z",
      },
      {
        action: "STATUS_CHANGED",
        note: "Đã phân công cho phòng Nhân sự rà soát",
        timestamp: "2026-11-11T09:30:00.000Z",
      },
    ],
    createdAt: "2026-11-11T08:00:00.000Z",
    updatedAt: "2026-11-11T09:30:00.000Z",
  },
];

const MOCK_HEALTH_SCANS: HealthScanResult[] = [
  {
    _id: "scan_001",
    scanId: "SCAN-20261112-0800",
    documentId: "doc_001",
    documentTitle: "Hợp đồng cung cấp hạ tầng Cloud 2026",
    originalFileName: "HD_Cloud_Infrastructure_2026.pdf",
    department: "Pháp chế",
    category: "contract",
    healthScore: 96,
    previousScore: 96,
    healthStatus: "healthy",
    integrityStatus: "intact",
    intact: true,
    expectedHash:
      "8f4e2b91c3a04d7e6f1234567890abcdef1234567890abcdef1234567890abcd",
    actualHash:
      "8f4e2b91c3a04d7e6f1234567890abcdef1234567890abcdef1234567890abcd",
    deductions: [],
    issuesDetected: 0,
    triggerSource: "cron",
    durationMs: 142,
    message: "Tài liệu nguyên vẹn, chữ ký SHA-256 trùng khớp.",
    scannedAt: "2026-11-12T08:00:00.000Z",
  },
  {
    _id: "scan_002",
    scanId: "SCAN-20261112-0745",
    documentId: "doc_002",
    documentTitle: "Báo cáo kiểm toán an ninh thông tin Q4",
    originalFileName: "Audit_ISO27001_Q4_2026.pdf",
    department: "An toàn thông tin",
    category: "legal",
    healthScore: 35,
    previousScore: 85,
    healthStatus: "critical",
    integrityStatus: "tampered",
    intact: false,
    expectedHash:
      "a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef",
    actualHash:
      "deadbeef99999999999999999999999999999999999999999999999999999999",
    deductions: MOCK_DOCUMENTS[1].healthDeductions,
    issuesDetected: 2,
    incidentCreated: "INC-202611-0042",
    triggerSource: "cron",
    durationMs: 215,
    message: "CẢNH BÁO: Sai lệch mã băm SHA-256, nghi ngờ chỉnh sửa trái phép.",
    scannedAt: "2026-11-12T07:45:00.000Z",
  },
  {
    _id: "scan_003",
    scanId: "SCAN-20261112-0745",
    documentId: "doc_003",
    documentTitle: "Quy chế lương thưởng & Bảo mật nhân sự",
    originalFileName: "HR_Compensation_Policy_2026.docx",
    department: "Nhân sự",
    category: "hr",
    healthScore: 70,
    previousScore: 85,
    healthStatus: "warning",
    integrityStatus: "intact",
    intact: true,
    expectedHash:
      "3c7e9a1b2d4f6081a3c5e7092b4d6f8102a4c6e8013579bdf02468ace13579bd",
    actualHash:
      "3c7e9a1b2d4f6081a3c5e7092b4d6f8102a4c6e8013579bdf02468ace13579bd",
    deductions: MOCK_DOCUMENTS[2].healthDeductions,
    issuesDetected: 2,
    triggerSource: "manual",
    durationMs: 118,
    message: "Tệp nguyên vẹn nhưng sắp hết hạn và thiếu phụ lục.",
    scannedAt: "2026-11-12T07:45:00.000Z",
  },
];

const MOCK_RECOVERY_POINTS: RecoveryPoint[] = [
  {
    _id: "rec_001",
    recoveryCode: "REC-202611-0018",
    documentId: MOCK_DOCUMENTS[1],
    documentTitle: "Báo cáo kiểm toán an ninh thông tin Q4",
    department: "An toàn thông tin",
    incidentId: MOCK_INCIDENTS[0],
    versionNumber: 1,
    status: "pending_approval",
    reason: "Khôi phục từ bản sao lưu bảo mật sau sự cố lệch SHA-256.",
    sourceBackupPath:
      "/storage/backups/1731390100_Audit_ISO27001_Q4_2026.pdf.backup",
    sourceBackupHash:
      "a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef",
    corruptedFileHash:
      "deadbeef99999999999999999999999999999999999999999999999999999999",
    backupSize: 4_120_000,
    isConfidentialDocument: true,
    requiresApproval: true,
    requestedBy: "security-ops@docuguard.io",
    approvalRequestedAt: "2026-11-12T07:48:00.000Z",
    verifiedAfterRestore: false,
    createdAt: "2026-11-12T07:48:00.000Z",
    updatedAt: "2026-11-12T07:48:00.000Z",
  },
  {
    _id: "rec_002",
    recoveryCode: "REC-202611-0017",
    documentId: MOCK_DOCUMENTS[0],
    documentTitle: "Hợp đồng cung cấp hạ tầng Cloud 2026",
    department: "Pháp chế",
    versionNumber: 2,
    status: "completed",
    reason: "Diễn tập Safe Recovery định kỳ kiểm tra tính toàn vẹn backup.",
    sourceBackupPath:
      "/storage/backups/1731390000_HD_Cloud_Infrastructure_2026.pdf.backup",
    sourceBackupHash:
      "8f4e2b91c3a04d7e6f1234567890abcdef1234567890abcdef1234567890abcd",
    backupSize: 2_458_624,
    isConfidentialDocument: true,
    requiresApproval: true,
    requestedBy: "admin@docuguard.io",
    approvedBy: "ciso@docuguard.io",
    approvalNotes: "Đã xác nhận diễn tập DR định kỳ.",
    approvalRequestedAt: "2026-11-10T09:00:00.000Z",
    approvalDecisionAt: "2026-11-10T09:12:00.000Z",
    restoredAt: "2026-11-10T09:12:08.000Z",
    verifiedAfterRestore: true,
    createdAt: "2026-11-10T09:00:00.000Z",
    updatedAt: "2026-11-10T09:12:08.000Z",
  },
];

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    _id: "aud_001",
    action: "document.tamper_detected",
    entityType: "document",
    entityId: "doc_002",
    entityName: "Báo cáo kiểm toán an ninh thông tin Q4",
    userEmail: "system-watcher@docuguard.io",
    userRole: "admin",
    ipAddress: "10.0.14.22",
    status: "failure",
    severity: "critical",
    description:
      "Phát hiện sai lệch SHA-256 trên tệp Audit_ISO27001_Q4_2026.pdf.",
    metadata: {
      expectedHash: "a1b2c3d4...abcdef",
      actualHash: "deadbeef...999999",
    },
    createdAt: "2026-11-12T07:45:00.000Z",
  },
  {
    _id: "aud_002",
    action: "recovery.requested",
    entityType: "recovery",
    entityId: "rec_001",
    entityName: "REC-202611-0018",
    userEmail: "security-ops@docuguard.io",
    userRole: "reviewer",
    ipAddress: "192.168.10.45",
    status: "success",
    severity: "warning",
    description:
      "Gửi yêu cầu phê duyệt Safe Recovery cho tài liệu tối mật doc_002.",
    createdAt: "2026-11-12T07:48:00.000Z",
  },
  {
    _id: "aud_003",
    action: "workflow.health_scan",
    entityType: "workflow",
    entityId: "wf_health_scanner",
    entityName: "DocuGuard Scheduled Health Scanner",
    userEmail: "n8n-bot@docuguard.io",
    userRole: "admin",
    ipAddress: "172.18.0.5",
    status: "success",
    severity: "info",
    description: "Hoàn tất quét sức khỏe định kỳ cho 3 tài liệu.",
    metadata: {
      scannedCount: 3,
      durationMs: 412,
      healthyCount: 1,
      warningCount: 1,
      criticalCount: 1,
    },
    createdAt: "2026-11-12T08:00:00.000Z",
  },
  {
    _id: "aud_004",
    action: "document.upload",
    entityType: "document",
    entityId: "doc_001",
    entityName: "HD_Cloud_Infrastructure_2026.pdf",
    userEmail: "legal-lead@docuguard.io",
    userRole: "reviewer",
    ipAddress: "10.0.8.14",
    status: "success",
    severity: "info",
    description:
      "Tải lên tài liệu mới kèm tạo bản sao lưu bảo mật và tính mã SHA-256.",
    metadata: {
      fileSize: 2458624,
      mimeType: "application/pdf",
      sha256: "8f4e2b91c3a04d7e6f1234567890abcdef1234567890abcdef1234567890abcd",
    },
    createdAt: "2026-11-12T06:30:00.000Z",
  },
  {
    _id: "aud_005",
    action: "auth.login",
    entityType: "user",
    entityId: "usr_admin_01",
    entityName: "Security Admin (SOC)",
    userEmail: "admin@docuguard.io",
    userRole: "admin",
    ipAddress: "192.168.1.102",
    status: "success",
    severity: "info",
    description: "Đăng nhập thành công vào bảng điều khiển SOC qua xác thực 2FA.",
    metadata: {
      mfaVerified: true,
      sessionDurationHours: 8,
    },
    createdAt: "2026-11-12T06:00:00.000Z",
  },
  {
    _id: "aud_006",
    action: "document.delete",
    entityType: "document",
    entityId: "doc_tmp_09",
    entityName: "Draft_Temp_Invoice_2025.pdf",
    userEmail: "finance-ops@docuguard.io",
    userRole: "reviewer",
    ipAddress: "10.0.12.77",
    status: "success",
    severity: "warning",
    description: "Xóa mềm tài liệu nháp hết hiệu lực theo chính sách lưu trữ.",
    metadata: {
      softDelete: true,
      retentionDays: 30,
    },
    createdAt: "2026-11-11T17:20:00.000Z",
  },
];

const MOCK_AUTOMATION_WORKFLOWS: AutomationWorkflow[] = [
  {
    _id: "wf_001",
    workflowType: "health_scanner",
    workflowName: "Automated Invoice Parsing & Audit Workflow",
    description:
      "Trích xuất dữ liệu hóa đơn PDF, đối chiếu chữ ký SHA-256 và ghi nhật ký kiểm toán tự động.",
    n8nWorkflowId: "n8n_wf_invoice_01",
    n8nExecutionId: "exec_10492",
    webhookUrl: "http://localhost:5678/webhook/invoice-audit",
    scheduleCron: "*/15 * * * *",
    isActive: true,
    triggerSource: "cron",
    status: "success",
    scannedDocumentsCount: 48,
    healthyCount: 41,
    warningCount: 5,
    criticalCount: 2,
    incidentsCreatedCount: 1,
    notificationsSentCount: 2,
    retryCount: 0,
    successRate: 99.4,
    lastRunAt: "2026-11-12T08:00:00.000Z",
    nextRunAt: "2026-11-12T08:15:00.000Z",
    startedAt: "2026-11-12T08:00:00.000Z",
    completedAt: "2026-11-12T08:00:04.000Z",
    durationMs: 4120,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-11-12T08:00:04.000Z",
  },
  {
    _id: "wf_002",
    workflowType: "auto_remediation",
    workflowName: "Auto-Quarantine High Risk Files",
    description:
      "Tự động cách ly tệp có điểm rủi ro vượt ngưỡng an toàn, tạo sự cố Critical và gửi cảnh báo SOC.",
    n8nWorkflowId: "n8n_wf_quarantine_02",
    n8nExecutionId: "exec_10489",
    webhookUrl: "http://localhost:5678/webhook/incident-remediation",
    isActive: true,
    triggerSource: "webhook",
    status: "running",
    scannedDocumentsCount: 12,
    healthyCount: 10,
    warningCount: 1,
    criticalCount: 1,
    incidentsCreatedCount: 1,
    notificationsSentCount: 3,
    retryCount: 0,
    successRate: 97.8,
    lastRunAt: "2026-11-12T07:45:05.000Z",
    startedAt: "2026-11-12T07:45:05.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-11-12T07:45:05.000Z",
  },
  {
    _id: "wf_003",
    workflowType: "workflow_monitor",
    workflowName: "Daily Snapshot Backup",
    description:
      "Tạo ảnh chụp sao lưu toàn bộ Document Vault mỗi ngày và kiểm tra chéo mã băm SHA-256.",
    n8nWorkflowId: "n8n_wf_snapshot_03",
    n8nExecutionId: "exec_10450",
    scheduleCron: "0 2 * * *",
    isActive: true,
    triggerSource: "cron",
    status: "success",
    scannedDocumentsCount: 48,
    healthyCount: 48,
    warningCount: 0,
    criticalCount: 0,
    incidentsCreatedCount: 0,
    notificationsSentCount: 1,
    retryCount: 0,
    successRate: 100,
    lastRunAt: "2026-11-12T02:00:00.000Z",
    nextRunAt: "2026-11-13T02:00:00.000Z",
    startedAt: "2026-11-12T02:00:00.000Z",
    completedAt: "2026-11-12T02:00:09.000Z",
    durationMs: 9240,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-11-12T02:00:09.000Z",
  },
  {
    _id: "wf_004",
    workflowType: "renewal_reminder",
    workflowName: "Contract & Policy Renewal Notifier",
    description: "Nhắc gia hạn tự động mốc 30, 15 và 7 ngày trước khi hết hạn.",
    n8nWorkflowId: "n8n_wf_renewal_04",
    n8nExecutionId: "exec_10412",
    scheduleCron: "0 8 * * *",
    isActive: false,
    triggerSource: "cron",
    status: "idle",
    scannedDocumentsCount: 48,
    healthyCount: 45,
    warningCount: 3,
    criticalCount: 0,
    incidentsCreatedCount: 0,
    notificationsSentCount: 3,
    retryCount: 0,
    successRate: 96.2,
    lastRunAt: "2026-11-11T08:00:00.000Z",
    nextRunAt: "2026-11-13T08:00:00.000Z",
    startedAt: "2026-11-11T08:00:00.000Z",
    completedAt: "2026-11-11T08:00:02.000Z",
    durationMs: 1850,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-11-11T08:00:02.000Z",
  },
];

const MOCK_DASHBOARD_SUMMARY: DashboardSummary = {
  totalDocuments: MOCK_DOCUMENTS.length,
  healthyDocuments: 1,
  warningDocuments: 1,
  criticalDocuments: 1,
  openIncidents: 2,
  expiringDocuments: 2,
  overallHealthScore: 67,
  riskRadar: [
    {
      documentId: "doc_002",
      title: "Báo cáo kiểm toán an ninh thông tin Q4",
      originalFileName: "Audit_ISO27001_Q4_2026.pdf",
      department: "An toàn thông tin",
      category: "legal",
      healthScore: 35,
      healthStatus: "critical",
      integrityStatus: "tampered",
      expiresAt: "2026-12-01T00:00:00.000Z",
      primaryRiskReason: "Sai lệch mã băm SHA-256 so với bản sao lưu gốc",
    },
    {
      documentId: "doc_003",
      title: "Quy chế lương thưởng & Bảo mật nhân sự",
      originalFileName: "HR_Compensation_Policy_2026.docx",
      department: "Nhân sự",
      category: "hr",
      healthScore: 70,
      healthStatus: "warning",
      integrityStatus: "intact",
      expiresAt: "2026-11-28T00:00:00.000Z",
      primaryRiskReason: "Sắp hết hạn trong 16 ngày & thiếu phụ lục bắt buộc",
    },
  ],
  recentIncidents: MOCK_INCIDENTS,
};

const MOCK_SYSTEM_HEALTH: SystemHealthCheck = {
  status: "ok",
  service: "docuguard-mock-gateway",
  version: "0.1.0",
  environment: "standalone-mock",
  checks: {
    server: "ok",
    database: "ok",
    n8n: "ok",
  },
};

export const MOCK_DATA = {
  documents: MOCK_DOCUMENTS,
  incidents: MOCK_INCIDENTS,
  healthScans: MOCK_HEALTH_SCANS,
  recoveryPoints: MOCK_RECOVERY_POINTS,
  auditLogs: MOCK_AUDIT_LOGS,
  automationWorkflows: MOCK_AUTOMATION_WORKFLOWS,
  dashboardSummary: MOCK_DASHBOARD_SUMMARY,
  systemHealth: MOCK_SYSTEM_HEALTH,
} as const;

function resolveMockData(method: string, path: string): unknown | undefined {
  const cleanPath = path.split("?")[0].replace(/\/+$/, "") || "/";

  if (method === "GET") {
    if (cleanPath === "/health") return MOCK_SYSTEM_HEALTH;
    if (
      cleanPath === "/dashboard/stats" ||
      cleanPath === "/dashboard/summary"
    ) {
      return MOCK_DASHBOARD_SUMMARY;
    }
    if (cleanPath === "/documents") return MOCK_DOCUMENTS;
    if (cleanPath.startsWith("/documents/")) {
      const id = cleanPath.replace("/documents/", "").split("/")[0];
      return MOCK_DOCUMENTS.find((doc) => doc._id === id) ?? MOCK_DOCUMENTS[0];
    }
    if (cleanPath === "/incidents/summary") {
      return {
        total: MOCK_INCIDENTS.length,
        open: MOCK_INCIDENTS.filter((i) => i.status === "open").length,
        inProgress: MOCK_INCIDENTS.filter((i) => i.status === "in_progress")
          .length,
        critical: MOCK_INCIDENTS.filter((i) => i.severity === "critical")
          .length,
      };
    }
    if (cleanPath === "/incidents") return MOCK_INCIDENTS;
    if (cleanPath.startsWith("/incidents/")) {
      const id = cleanPath.replace("/incidents/", "").split("/")[0];
      return MOCK_INCIDENTS.find((inc) => inc._id === id) ?? MOCK_INCIDENTS[0];
    }
    if (
      cleanPath === "/health-scanner" ||
      cleanPath === "/health-scanner/results"
    ) {
      return MOCK_HEALTH_SCANS;
    }
    if (cleanPath === "/health-scanner/summary") {
      const summary: HealthScanSummary = {
        totalScanned: MOCK_HEALTH_SCANS.length,
        healthyCount: 1,
        warningCount: 1,
        criticalCount: 1,
        tamperedCount: 1,
        missingCount: 0,
        averageScore: 67,
        lastScanAt: "2026-11-12T08:00:00.000Z",
        results: MOCK_HEALTH_SCANS,
      };
      return summary;
    }
    if (cleanPath === "/recovery" || cleanPath === "/recoveries") {
      return MOCK_RECOVERY_POINTS;
    }
    if (
      cleanPath.startsWith("/recovery/") ||
      cleanPath.startsWith("/recoveries/")
    ) {
      const id = cleanPath.split("/")[2];
      return (
        MOCK_RECOVERY_POINTS.find((r) => r._id === id) ??
        MOCK_RECOVERY_POINTS[0]
      );
    }
    if (cleanPath === "/audit-logs") return MOCK_AUDIT_LOGS;
    if (cleanPath === "/automation" || cleanPath === "/automation/workflows") {
      return MOCK_AUTOMATION_WORKFLOWS;
    }
  }

  if (method === "POST") {
    if (cleanPath.endsWith("/verify-integrity")) {
      return MOCK_HEALTH_SCANS[0];
    }
    if (cleanPath === "/health-scanner/scan") {
      return MOCK_HEALTH_SCANS;
    }
    if (cleanPath.endsWith("/recover")) {
      return MOCK_RECOVERY_POINTS[0];
    }
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────
// CORE FETCH WRAPPER
// ─────────────────────────────────────────────────────────────

function buildUrl(
  path: string,
  params?: Record<string, QueryParamValue>,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith("/api/")
    ? normalizedPath
    : `/api${normalizedPath}`;
  const url = new URL(`${BASE_URL}${apiPath}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseErrorResponse(
  response: Response,
  path: string,
): Promise<ApiException> {
  try {
    const json = (await response.json()) as Partial<ApiError>;
    const rawMessage = json.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : rawMessage || `Lỗi HTTP ${response.status}: ${response.statusText}`;

    return new ApiException(json.statusCode ?? response.status, message, {
      path: json.path ?? path,
      timestamp: json.timestamp,
      details: json,
    });
  } catch {
    return new ApiException(
      response.status,
      `Lỗi máy chủ (${response.status} ${response.statusText})`,
      { path },
    );
  }
}

async function request<T>(
  path: string,
  options: RequestOptions & { method?: string; body?: BodyInit | null } = {},
): Promise<ApiResponse<T>> {
  const {
    params,
    token,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    mockFallback = true,
    headers: customHeaders,
    signal: externalSignal,
    method = "GET",
    body,
    ...fetchInit
  } = options;

  if (FORCE_MOCK) {
    const mockData = resolveMockData(method, path);
    if (mockData !== undefined) {
      return {
        success: true,
        data: mockData as T,
        timestamp: new Date().toISOString(),
        isMock: true,
      };
    }
  }

  const url = buildUrl(path, params);
  const bearerToken = token ?? getAuthToken();
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers = new Headers(customHeaders);
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (bearerToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const onExternalAbort = () => timeoutController.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      timeoutController.abort();
    } else {
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchInit,
      method,
      body,
      headers,
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response, path);
    }

    if (response.status === 204) {
      return {
        success: true,
        data: undefined as T,
        timestamp: new Date().toISOString(),
      };
    }

    const json = (await response.json()) as ApiResponse<T> | T;
    if (
      typeof json === "object" &&
      json !== null &&
      "success" in json &&
      "data" in json
    ) {
      return json as ApiResponse<T>;
    }

    return {
      success: true,
      data: json as T,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Không nuốt lỗi nghiệp vụ HTTP 4xx/5xx từ backend thật hoặc lỗi hủy chủ động từ caller
    if (err instanceof ApiException || externalSignal?.aborted) {
      throw err;
    }

    if (mockFallback) {
      const mockData = resolveMockData(method, path);
      if (mockData !== undefined) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[DocuGuard API] Backend không phản hồi (${method} ${path}), đang dùng mock fallback data.`,
          );
        }
        return {
          success: true,
          data: mockData as T,
          timestamp: new Date().toISOString(),
          isMock: true,
        };
      }
    }

    throw new ApiException(0, normalizeApiError(err), { path });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC TYPE-SAFE API CLIENT
// ─────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),

  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: formData,
    }),
};
