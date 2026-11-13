/**
 * types/index.ts
 *
 * Khai báo tập trung các kiểu TypeScript dùng trong frontend DocuGuard.
 * Đồng bộ với Mongoose Schemas của backend và các module Cybersecurity SaaS.
 */

// ─────────────────────────────────────────────────────────────
// ENUMS & TYPES CƠ BẢN
// ─────────────────────────────────────────────────────────────

export type HealthScore = number; // 0 - 100

export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

export type IntegrityStatus = "intact" | "tampered" | "missing";

export type DocumentStatus = "active" | "archived" | "deleted";

export type DocumentCategory =
  | "contract"
  | "financial"
  | "hr"
  | "legal"
  | "technical"
  | "operational"
  | "other";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "open" | "in_progress" | "resolved" | "closed";

export type IncidentType =
  | "integrity_violation"
  | "missing_file"
  | "expired"
  | "expiring_soon"
  | "duplicate"
  | "missing_appendix"
  | "low_health_score"
  | "workflow_failure";

export type RecoveryStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed";

export type WorkflowType =
  | "health_scanner"
  | "auto_remediation"
  | "renewal_reminder"
  | "workflow_monitor";

export type WorkflowTriggerSource = "cron" | "webhook" | "manual";

export type WorkflowExecutionStatus =
  | "idle"
  | "running"
  | "success"
  | "failed"
  | "stuck"
  | "retrying";

export type AuditAction =
  | "document.upload"
  | "document.view"
  | "document.download"
  | "document.update"
  | "document.delete"
  | "document.integrity_check"
  | "document.tamper_detected"
  | "document.version_restore"
  | "recovery.requested"
  | "recovery.approved"
  | "recovery.rejected"
  | "recovery.executed"
  | "incident.created"
  | "incident.assigned"
  | "incident.status_change"
  | "incident.resolved"
  | "workflow.health_scan"
  | "workflow.auto_remediation"
  | "workflow.renewal_reminder"
  | "workflow.failure_alert"
  | "auth.login"
  | "auth.logout";

export type AuditEntityType =
  | "document"
  | "document_version"
  | "incident"
  | "recovery"
  | "workflow"
  | "user"
  | "system";

export type UserRole = "admin" | "auditor" | "reviewer" | "viewer";

// ─────────────────────────────────────────────────────────────
// NGƯỜI DÙNG (User)
// ─────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  email: string;
  fullName: string;
  department?: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// TÀI LIỆU (Document) & SUB-ENTITIES
// ─────────────────────────────────────────────────────────────

export interface HealthDeduction {
  rule: string;
  reason: string;
  pointsDeducted: number;
  detectedAt: string;
}

export interface RenewalRemindersSent {
  day30: boolean;
  day15: boolean;
  day7: boolean;
}

export interface Document {
  _id: string;
  title: string;
  description?: string;
  originalFileName: string;
  filePath: string;
  backupFilePath?: string;
  backupHash?: string;
  mimeType: string;
  fileSize: number;
  fileHash: string; // SHA-256 fingerprint
  category: DocumentCategory;
  department: string;
  issueDate?: string;
  expiresAt?: string;
  status: DocumentStatus;
  isConfidential: boolean;

  // Health & Integrity
  healthScore: HealthScore;
  healthStatus: HealthStatus;
  healthDeductions: HealthDeduction[];
  integrityStatus: IntegrityStatus;
  lastIntegrityCheckAt?: string;
  lastHealthScanAt?: string;
  isMissing: boolean;

  // Duplicate & Appendices
  isDuplicate: boolean;
  duplicateOf?: string;
  duplicateCount: number;
  requiredAppendices: string[];
  attachedAppendices: string[];
  missingAppendices: string[];
  hasMissingAppendix: boolean;

  // Versioning & Workflow
  currentVersion: number;
  renewalRemindersSent: RenewalRemindersSent;
  uploadedBy?: string | User;
  tags: string[];
  metadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// LỊCH SỬ PHIÊN BẢN (Document Version)
// ─────────────────────────────────────────────────────────────

export interface DocumentVersion {
  _id: string;
  documentId: string;
  versionNumber: number;
  originalFileName: string;
  filePath: string;
  fileHash: string;
  fileSize: number;
  mimeType: string;
  changeReason?: string;
  uploadedBy?: string | User;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// KẾT QUẢ QUÉT SỨC KHỎE & TOÀN VẸN (HealthScanResult)
// ─────────────────────────────────────────────────────────────

export interface HealthScanResult {
  _id: string;
  scanId: string;
  documentId: string | Document;
  documentTitle: string;
  originalFileName?: string;
  department: string;
  category?: DocumentCategory;
  healthScore: HealthScore;
  previousScore?: HealthScore;
  healthStatus: HealthStatus;
  integrityStatus: IntegrityStatus;
  intact: boolean;
  expectedHash: string;
  actualHash?: string;
  deductions: HealthDeduction[];
  issuesDetected: number;
  incidentCreated?: string;
  triggerSource: WorkflowTriggerSource;
  durationMs?: number;
  message?: string;
  scannedAt: string;
}

export interface HealthScanSummary {
  totalScanned: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  tamperedCount: number;
  missingCount: number;
  averageScore: HealthScore;
  lastScanAt: string;
  results: HealthScanResult[];
}

// ─────────────────────────────────────────────────────────────
// SỰ CỐ (Incident)
// ─────────────────────────────────────────────────────────────

export interface IncidentTimelineEntry {
  action: string;
  note: string;
  performedBy?: string | User;
  timestamp: string;
}

export interface Incident {
  _id: string;
  incidentCode: string;
  documentId?: string | Document;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  assignedTo?: string | User;
  slaDeadline?: string;
  slaBreached: boolean;
  n8nWorkflowId?: string;
  n8nExecutionId?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string | User;
  timeline: IncidentTimelineEntry[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// ĐIỂM KHÔI PHỤC AN TOÀN (RecoveryPoint)
// ─────────────────────────────────────────────────────────────

export interface RecoveryPoint {
  _id: string;
  recoveryCode?: string;
  documentId: string | Document;
  documentTitle?: string;
  department?: string;
  incidentId?: string | Incident;
  versionNumber?: number;
  status: RecoveryStatus;
  reason: string;
  sourceBackupPath: string;
  sourceBackupHash: string;
  corruptedFileHash?: string;
  backupSize?: number;
  isConfidentialDocument: boolean;
  requiresApproval?: boolean;
  requestedBy: string | User;
  approvedBy?: string | User;
  approvalToken?: string;
  approvalNotes?: string;
  approvalRequestedAt?: string;
  approvalDecisionAt?: string;
  restoredAt?: string;
  verifiedAfterRestore?: boolean;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/** Alias tương thích ngược với schema Recovery ở backend */
export type Recovery = RecoveryPoint;

// ─────────────────────────────────────────────────────────────
// NHẬT KÝ KIỂM TOÁN (AuditLog)
// ─────────────────────────────────────────────────────────────

export interface AuditLog {
  _id: string;
  action: AuditAction | (string & {});
  entityType: AuditEntityType | (string & {});
  entityId: string;
  entityName?: string;
  userId?: string | User;
  userEmail?: string;
  userRole?: UserRole | string;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
  severity?: "info" | "warning" | "critical";
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// TỰ ĐỘNG HÓA N8N (AutomationWorkflow)
// ─────────────────────────────────────────────────────────────

export interface AutomationWorkflow {
  _id: string;
  workflowType: WorkflowType;
  workflowName: string;
  description?: string;
  n8nWorkflowId?: string;
  n8nExecutionId?: string;
  webhookUrl?: string;
  scheduleCron?: string;
  isActive: boolean;
  triggerSource: WorkflowTriggerSource;
  status: WorkflowExecutionStatus;
  scannedDocumentsCount: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  incidentsCreatedCount: number;
  notificationsSentCount: number;
  retryCount: number;
  successRate?: number;
  errorDetails?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Alias tương thích ngược với AutomationLog */
export type AutomationLog = AutomationWorkflow;

// ─────────────────────────────────────────────────────────────
// BẢNG ĐIỀU KHIỂN & RISK RADAR (Dashboard Summary & Trends)
// ─────────────────────────────────────────────────────────────

export interface RiskRadarItem {
  documentId: string;
  title: string;
  originalFileName?: string;
  department?: string;
  category?: DocumentCategory;
  healthScore: HealthScore;
  healthStatus?: HealthStatus;
  integrityStatus?: IntegrityStatus;
  expiresAt?: string;
  primaryRiskReason?: string;
}

export interface DashboardSummary {
  totalDocuments: number;
  healthyDocuments: number;
  warningDocuments: number;
  criticalDocuments: number;
  openIncidents: number;
  expiringDocuments: number;
  overallHealthScore: HealthScore;
  riskRadar?: RiskRadarItem[];
  recentIncidents?: Incident[];
}

export interface HealthSnapshot {
  _id: string;
  snapshotDate: string;
  overallHealthScore: number;
  totalDocuments: number;
  healthyDocuments: number;
  warningDocuments: number;
  criticalDocuments: number;
  openIncidents: number;
  expiringIn30DaysDocuments: number;
  topRiskRadar: RiskRadarItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemHealthCheck {
  status: "ok" | "degraded" | "down";
  service: string;
  version: string;
  environment: string;
  checks: {
    server: "ok" | "down";
    database: "ok" | "disconnected";
    n8n: "ok" | "unreachable";
  };
}
