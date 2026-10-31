/**
 * constants/index.ts
 * Hằng số cấu hình hệ thống DocuGuard.
 */

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  DOCUMENTS: '/documents',
  HEALTH_SCANNER: '/health-scanner',
  INCIDENTS: '/incidents',
  RECOVERY: '/recovery',
  AUDIT_LOGS: '/audit-logs',
  AUTOMATION: '/automation',
  SETTINGS: '/settings',
} as const;

export const NAV_ITEMS = [
  { label: 'Bảng điều khiển', href: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Kho tài liệu', href: ROUTES.DOCUMENTS, icon: 'FileText' },
  { label: 'Health Scanner', href: ROUTES.HEALTH_SCANNER, icon: 'Activity' },
  { label: 'Trung tâm sự cố', href: ROUTES.INCIDENTS, icon: 'AlertTriangle' },
  { label: 'Khôi phục', href: ROUTES.RECOVERY, icon: 'RefreshCw' },
  { label: 'Audit Log', href: ROUTES.AUDIT_LOGS, icon: 'History' },
  { label: 'Tự động hóa', href: ROUTES.AUTOMATION, icon: 'Workflow' },
  { label: 'Cài đặt', href: ROUTES.SETTINGS, icon: 'Settings' },
] as const;

export const HEALTH_STATUS_COLORS = {
  healthy: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
  warning: 'text-amber-700 bg-amber-50 border-amber-200/80',
  critical: 'text-rose-700 bg-rose-50 border-rose-200/80',
  unknown: 'text-slate-600 bg-slate-100 border-slate-200',
} as const;

export const SEVERITY_COLORS = {
  low: 'text-blue-700 bg-blue-50 border-blue-200/80',
  medium: 'text-amber-700 bg-amber-50 border-amber-200/80',
  high: 'text-orange-700 bg-orange-50 border-orange-200/80',
  critical: 'text-rose-700 bg-rose-50 border-rose-200/80',
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;