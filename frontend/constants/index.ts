/**
 * constants/index.ts
 *
 * Hằng số dùng trong frontend DocuGuard.
 *
 * NGUYÊN TẮC:
 * - Các giá trị không thay đổi ở runtime đặt ở đây.
 * - Tránh string literal lặp lại trong code.
 */

// ─────────────────────────────────────────────────────────────
// ROUTE PATHS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// NAVIGATION MENU
// ─────────────────────────────────────────────────────────────

export const NAV_ITEMS = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Kho tài liệu', href: ROUTES.DOCUMENTS, icon: 'FileText' },
  { label: 'Health Scanner', href: ROUTES.HEALTH_SCANNER, icon: 'Activity' },
  { label: 'Sự cố', href: ROUTES.INCIDENTS, icon: 'AlertTriangle' },
  { label: 'Khôi phục', href: ROUTES.RECOVERY, icon: 'RefreshCw' },
  { label: 'Audit Log', href: ROUTES.AUDIT_LOGS, icon: 'History' },
  { label: 'Tự động hóa', href: ROUTES.AUTOMATION, icon: 'Workflow' },
  { label: 'Cài đặt', href: ROUTES.SETTINGS, icon: 'Settings' },
] as const;

// ─────────────────────────────────────────────────────────────
// HEALTH STATUS COLORS — dùng với Tailwind CSS
// ─────────────────────────────────────────────────────────────

export const HEALTH_STATUS_COLORS = {
  healthy: 'text-green-600 bg-green-100',
  warning: 'text-yellow-600 bg-yellow-100',
  critical: 'text-red-600 bg-red-100',
  unknown: 'text-gray-600 bg-gray-100',
} as const;

// ─────────────────────────────────────────────────────────────
// INCIDENT SEVERITY COLORS
// ─────────────────────────────────────────────────────────────

export const SEVERITY_COLORS = {
  low: 'text-blue-600 bg-blue-100',
  medium: 'text-yellow-600 bg-yellow-100',
  high: 'text-orange-600 bg-orange-100',
  critical: 'text-red-600 bg-red-100',
} as const;

// ─────────────────────────────────────────────────────────────
// PHÂN TRANG
// ─────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
