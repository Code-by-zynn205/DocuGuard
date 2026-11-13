/**
 * constants/index.ts
 *
 * Hằng số dùng trong frontend DocuGuard.
 * Bao gồm ROUTES, NAV_ITEMS và bảng ánh xạ màu sắc Cybersecurity SaaS (Tailwind CSS v4).
 */

import type {
  DocumentCategory,
  DocumentStatus,
  HealthStatus,
  IncidentSeverity,
  IncidentStatus,
  IntegrityStatus,
  RecoveryStatus,
  UserRole,
  WorkflowExecutionStatus,
} from '@/types';

// ─────────────────────────────────────────────────────────────
// ROUTE PATHS
// ─────────────────────────────────────────────────────────────

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  DOCUMENTS: '/documents',
  HEALTH_SCANNER: '/health-scanner',
  INCIDENTS: '/incidents',
  RECOVERY: '/recovery',
  AUDIT_LOGS: '/audit-logs',
  AUTOMATION: '/automation',
  DRIVE_CLIPPER: '/drive-clipper',
  SETTINGS: '/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

// ─────────────────────────────────────────────────────────────
// NAVIGATION MENU (kèm icon name tương thích lucide-react)
// ─────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: AppRoute;
  icon: string;
  description: string;
  section: 'overview' | 'security' | 'operations';
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'LayoutDashboard',
    description: 'Tổng quan bảo mật & Risk Radar',
    section: 'overview',
  },
  {
    label: 'Kho tài liệu',
    href: ROUTES.DOCUMENTS,
    icon: 'FileText',
    description: 'Quản lý tài liệu & chữ ký SHA-256',
    section: 'overview',
  },
  {
    label: 'Health Scanner',
    href: ROUTES.HEALTH_SCANNER,
    icon: 'ShieldCheck',
    description: 'Quét sức khỏe & kiểm tra toàn vẹn',
    section: 'security',
  },
  {
    label: 'Sự cố',
    href: ROUTES.INCIDENTS,
    icon: 'AlertTriangle',
    description: 'Cảnh báo xâm phạm & theo dõi SLA',
    section: 'security',
  },
  {
    label: 'Khôi phục',
    href: ROUTES.RECOVERY,
    icon: 'RotateCcw',
    description: 'Safe Recovery 1-Click & phê duyệt',
    section: 'security',
  },
  {
    label: 'Audit Logs',
    href: ROUTES.AUDIT_LOGS,
    icon: 'ScrollText',
    description: 'Nhật ký kiểm toán bất biến',
    section: 'operations',
  },
  {
    label: 'Tự động hóa',
    href: ROUTES.AUTOMATION,
    icon: 'Workflow',
    description: 'Giám sát workflow n8n',
    section: 'operations',
  },
  {
    label: 'Drive & Clipper AI',
    href: ROUTES.DRIVE_CLIPPER,
    icon: 'Cloud',
    description: 'Đồng bộ Google Drive & Smart Web Clipper',
    section: 'operations',
  },
  {
    label: 'Cài đặt',
    href: ROUTES.SETTINGS,
    icon: 'Settings',
    description: 'Cấu hình hệ thống & thông báo',
    section: 'operations',
  },
] as const;

// ─────────────────────────────────────────────────────────────
// CYBERSECURITY SAAS STATUS & SEVERITY COLORS (Tailwind v4)
// ─────────────────────────────────────────────────────────────

export type StatusColorKey =
  | HealthStatus
  | IntegrityStatus
  | DocumentStatus
  | IncidentStatus
  | RecoveryStatus
  | WorkflowExecutionStatus
  | 'success'
  | 'failure';

/**
 * Ánh xạ màu sắc trạng thái theo phong cách Cybersecurity SaaS hiện đại:
 * Nền bán trong suốt, viền sắc nét, độ tương phản cao trên cả Light & Dark mode.
 */
export const STATUS_COLORS: Record<StatusColorKey, string> = {
  // Health Status
  healthy:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
  warning:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25',
  critical:
    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30',
  unknown:
    'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/25',

  // Integrity Status
  intact:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
  tampered:
    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/35',
  missing:
    'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/35',

  // Document Status
  active:
    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25',
  archived:
    'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/25',
  deleted:
    'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/25',

  // Incident Status
  open:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  in_progress:
    'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30',
  resolved:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
  closed:
    'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/25',

  // Recovery Status
  pending_approval:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  approved:
    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
  rejected:
    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30',
  executing:
    'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
  completed:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
  failed:
    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/35',

  // Automation Workflow & Audit Status
  idle:
    'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/25',
  running:
    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
  success:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
  stuck:
    'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30',
  retrying:
    'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30',
  failure:
    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/35',
} as const;

/** Tương thích ngược với docs/FRONTEND_GUIDE.md */
export const HEALTH_STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: STATUS_COLORS.healthy,
  warning: STATUS_COLORS.warning,
  critical: STATUS_COLORS.critical,
  unknown: STATUS_COLORS.unknown,
} as const;

/**
 * Màu chấm tròn (indicator dot) đi kèm badge trạng thái.
 */
export const STATUS_DOT_COLORS: Record<StatusColorKey, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-rose-500',
  unknown: 'bg-slate-400',
  intact: 'bg-emerald-500',
  tampered: 'bg-rose-500',
  missing: 'bg-red-500',
  active: 'bg-cyan-500',
  archived: 'bg-slate-400',
  deleted: 'bg-zinc-400',
  open: 'bg-amber-500',
  in_progress: 'bg-sky-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-slate-400',
  pending_approval: 'bg-amber-500',
  approved: 'bg-cyan-500',
  rejected: 'bg-rose-500',
  executing: 'bg-indigo-500',
  completed: 'bg-emerald-500',
  failed: 'bg-rose-500',
  idle: 'bg-slate-400',
  running: 'bg-cyan-500',
  success: 'bg-emerald-500',
  stuck: 'bg-orange-500',
  retrying: 'bg-violet-500',
  failure: 'bg-rose-500',
} as const;

/**
 * Ánh xạ màu sắc mức độ nghiêm trọng sự cố (Incident Severity).
 */
export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  low: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25',
  medium:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30',
  critical:
    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/35',
} as const;

// ─────────────────────────────────────────────────────────────
// NHÃN HIỂN THỊ TIẾNG VIỆT (UI LABELS)
// ─────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<StatusColorKey, string> = {
  healthy: 'Khỏe mạnh',
  warning: 'Cảnh báo',
  critical: 'Nguy hiểm',
  unknown: 'Chưa rõ',
  intact: 'Nguyên vẹn',
  tampered: 'Bị chỉnh sửa',
  missing: 'Thất lạc',
  active: 'Đang hoạt động',
  archived: 'Lưu trữ',
  deleted: 'Đã xóa',
  open: 'Đang mở',
  in_progress: 'Đang xử lý',
  resolved: 'Đã khắc phục',
  closed: 'Đã đóng',
  pending_approval: 'Chờ phê duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  executing: 'Đang khôi phục',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  idle: 'Chờ kích hoạt',
  running: 'Đang chạy',
  success: 'Thành công',
  stuck: 'Bị kẹt',
  retrying: 'Đang thử lại',
  failure: 'Thất bại',
} as const;

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
} as const;

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contract: 'Hợp đồng',
  financial: 'Tài chính',
  hr: 'Nhân sự',
  legal: 'Pháp chế',
  technical: 'Kỹ thuật',
  operational: 'Vận hành',
  other: 'Khác',
} as const;

// ─────────────────────────────────────────────────────────────
// CẤU HÌNH PHÂN TRANG & AUTH
// ─────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const AUTH_TOKEN_STORAGE_KEY = 'docuguard_access_token';
export const AUTH_USER_STORAGE_KEY = 'docuguard_user';
export const AUTH_COOKIE_NAME = 'docuguard_token';
export const AUTH_ROLE_COOKIE_NAME = 'docuguard_role';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  auditor: 'Auditor',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:
    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
  auditor:
    'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30',
  reviewer:
    'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
  viewer:
    'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30',
};
