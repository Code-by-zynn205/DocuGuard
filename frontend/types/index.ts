/**
 * types/index.ts
 *
 * Khai báo tập trung các kiểu TypeScript dùng trong frontend DocuGuard.
 * Đồng bộ 100% với Mongoose Schemas của backend.
 */

// ─────────────────────────────────────────────────────────────
// ENUMS & TYPES CƠ BẢN
// ─────────────────────────────────────────────────────────────

export type HealthScore = number; // 0 - 100

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export type IntegrityStatus = 'intact' | 'tampered' | 'missing';

export type DocumentStatus = 'active' | 'archived' | 'deleted';

export type DocumentCategory =
  | 'contract'
  | 'financial'
  | 'hr'
  | 'legal'
  | 'technical'
  | 'operational'
  | 'other';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type IncidentType =
  | 'integrity_violation'
  | 'missing_file'
  | 'expired'
  | 'expiring_soon'
  | 'duplicate'
  | 'missing_appendix'
  | 'low_health_score'
  | 'workflow_failure';

export type RecoveryStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed';

export type UserRole = 'admin' | 'reviewer' | 'viewer';

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
// KHÔI PHỤC AN TOÀN (Safe Recovery)
// ─────────────────────────────────────────────────────────────

export interface Recovery {
  _id: string;
  documentId: string | Document;
  incidentId?: string | Incident;
  status: RecoveryStatus;
  reason: string;
  sourceBackupPath: string;
  sourceBackupHash: string;
  corruptedFileHash?: string;
  isConfidentialDocument: boolean;
  requestedBy: string | User;
  approvedBy?: string | User;
  approvalToken?: string;
  approvalNotes?: string;
  approvalRequestedAt?: string;
  approvalDecisionAt?: string;
  restoredAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// NHẬT KÝ KIỂM TOÁN (Audit Log)
// ─────────────────────────────────────────────────────────────

export interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string | User;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// TỰ ĐỘNG HÓA N8N (Automation Log)
// ─────────────────────────────────────────────────────────────

export interface AutomationLog {
  _id: string;
  workflowType: 'health_scanner' | 'auto_remediation' | 'renewal_reminder' | 'workflow_monitor';
  workflowName: string;
  n8nWorkflowId?: string;
  n8nExecutionId?: string;
  triggerSource: 'cron' | 'webhook' | 'manual';
  status: 'running' | 'success' | 'failed' | 'stuck' | 'retrying';
  scannedDocumentsCount: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  incidentsCreatedCount: number;
  notificationsSentCount: number;
  retryCount: number;
  errorDetails?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────
// BẢNG ĐIỀU KHIỂN & RISK RADAR (Dashboard Summary & Trends)
// ─────────────────────────────────────────────────────────────

export interface RiskRadarItem {
  documentId: string;
  title: string;
  department: string;
  healthScore: number;
  primaryRiskReason: string;
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
