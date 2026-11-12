'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  UserCheck,
} from 'lucide-react';
import { NAV_ITEMS, ROLE_COLORS, ROLE_LABELS, ROUTES } from '@/constants';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/hooks/useToast';
import {
  AUTH_CHANGE_EVENT,
  clearAuthSession,
  DEMO_ACCOUNTS,
  getAuthUser,
  getUserInitials,
  type AuthSessionUser,
} from '@/lib/auth';
import { CommandPalette } from '@/components/common/CommandPalette';
import { Badge } from '@/components/ui/Badge';
import type { Incident, SystemHealthCheck } from '@/types';

export interface HeaderProps {
  onMenuClick?: () => void;
}

const THEME_STORAGE_KEY = 'docuguard_theme';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  documents: 'Kho tài liệu',
  'health-scanner': 'Health Scanner',
  incidents: 'Sự cố',
  recovery: 'Khôi phục',
  'audit-logs': 'Audit Logs',
  automation: 'Tự động hóa',
  settings: 'Cài đặt',
};

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname() ?? '/dashboard';
  const router = useRouter();
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const {
    data: healthData,
    isMock: isMockHealth,
    refetch: refetchHealth,
  } = useApi<SystemHealthCheck>('/health');
  const { data: incidentsData, refetch: refetchIncidents } =
    useApi<Incident[]>('/incidents');

  // Đồng bộ user & theme từ localStorage khi mount
  useEffect(() => {
    const syncAuthAndTheme = () => {
      setCurrentUser(getAuthUser());

      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      const resolvedTheme: 'light' | 'dark' =
        savedTheme === 'dark' || savedTheme === 'light'
          ? savedTheme
          : prefersDark
            ? 'dark'
            : 'light';

      setTheme(resolvedTheme);
      document.documentElement.classList.toggle(
        'dark',
        resolvedTheme === 'dark',
      );
    };

    void Promise.resolve().then(syncAuthAndTheme);

    const handleAuthChange = () => setCurrentUser(getAuthUser());
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
  }, []);

  // Giả lập Real-time Monitoring heartbeat mỗi 30s
  useEffect(() => {
    const interval = setInterval(() => {
      void refetchHealth();
      void refetchIncidents();
    }, 30_000);

    return () => clearInterval(interval);
  }, [refetchHealth, refetchIncidents]);

  // Phím tắt Ctrl+K / Cmd+K mở Command Palette
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
        setNotificationsOpen(false);
        setProfileOpen(false);
      } else if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return [{ label: 'Dashboard', href: ROUTES.DASHBOARD }];
    }

    return segments.map((segment, idx) => {
      const href = `/${segments.slice(0, idx + 1).join('/')}`;
      const matchedNav = NAV_ITEMS.find((item) => item.href === href);
      const label =
        matchedNav?.label ??
        SEGMENT_LABELS[segment] ??
        decodeURIComponent(segment);
      return { label, href };
    });
  }, [pathname]);

  const openIncidents = useMemo(
    () =>
      (incidentsData ?? []).filter(
        (inc) => inc.status === 'open' || inc.status === 'in_progress',
      ),
    [incidentsData],
  );

  const systemStatusLabel =
    healthData?.status === 'ok'
      ? isMockHealth
        ? 'Live Pulse • Mock'
        : 'Live Pulse • Online'
      : healthData?.status === 'degraded'
        ? 'Live Pulse • Degraded'
        : 'Live Pulse...';

  const systemDotClass =
    healthData?.status === 'ok'
      ? isMockHealth
        ? 'bg-cyan-500'
        : 'bg-emerald-500'
      : healthData?.status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-slate-400';

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 px-4 sm:px-6 backdrop-blur-md transition-colors">
        {/* Left: Mobile Menu Button + Breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Mở menu điều hướng"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-sm"
          >
            <Link
              href={ROUTES.DASHBOARD}
              className="hidden sm:inline font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              DocuGuard
            </Link>

            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.href}>
                  <ChevronRight
                    className="hidden sm:inline h-3.5 w-3.5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  {isLast ? (
                    <span className="truncate font-semibold text-slate-900 dark:text-white">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="truncate font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Right: Command Palette Trigger + Live Pulse + Theme Toggle + Notifications + Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="Mở Command Palette (Ctrl+K)"
            className="hidden md:flex h-9 w-60 lg:w-72 items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 px-3 text-xs text-slate-500 dark:text-slate-400 hover:border-cyan-500/50 hover:bg-white dark:hover:bg-slate-950 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">Tìm nhanh tài liệu, sự cố...</span>
            </span>
            <kbd className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Ctrl K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="Tìm kiếm nhanh"
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Real-time Live Pulse Indicator */}
          <div
            title={`Real-time SOC Telemetry | Server: ${healthData?.checks?.server ?? 'checking'} | DB: ${healthData?.checks?.database ?? 'checking'} | n8n: ${healthData?.checks?.n8n ?? 'checking'}`}
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${systemDotClass}`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${systemDotClass}`}
              />
            </span>
            <Activity
              className="h-3.5 w-3.5 text-cyan-500"
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">{systemStatusLabel}</span>
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark'
                ? 'Chuyển sang giao diện Sáng'
                : 'Chuyển sang giao diện Tối'
            }
            title={
              theme === 'dark'
                ? 'Chuyển sang Light Mode'
                : 'Chuyển sang Dark Mode'
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileOpen(false);
              }}
              aria-label="Thông báo bảo mật"
              aria-expanded={notificationsOpen}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {openIncidents.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow">
                  {openIncidents.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Cảnh báo bảo mật ({openIncidents.length})
                    </span>
                  </div>
                  <Link
                    href={ROUTES.INCIDENTS}
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Xem tất cả
                  </Link>
                </div>

                <div className="max-h-72 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
                  {openIncidents.length > 0 ? (
                    openIncidents.slice(0, 5).map((inc) => (
                      <Link
                        key={inc._id}
                        href={ROUTES.INCIDENTS}
                        onClick={() => setNotificationsOpen(false)}
                        className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                            {inc.incidentCode}
                          </span>
                          <Badge severity={inc.severity} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                          {inc.title}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                      Không có cảnh báo nào đang mở.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar & Menu */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              aria-label="Tài khoản quản trị"
              aria-expanded={profileOpen}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 pl-1 pr-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
                {getUserInitials(
                  currentUser?.fullName ?? DEMO_ACCOUNTS.admin.fullName,
                )}
              </div>
              <div className="hidden text-left sm:block leading-tight">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {currentUser?.fullName ?? 'Guest Operator'}
                  </p>
                  {currentUser && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[currentUser.role]}`}
                    >
                      {ROLE_LABELS[currentUser.role]}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {currentUser?.title ?? 'SOC Session'}
                </p>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-11 z-40 w-64 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {currentUser?.fullName ?? 'Chưa đăng nhập'}
                    </p>
                    {currentUser && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ROLE_COLORS[currentUser.role]}`}
                      >
                        {ROLE_LABELS[currentUser.role]}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {currentUser?.email ?? 'guest@docuguard.io'}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <UserCheck className="h-3 w-3" />
                    {currentUser?.department ?? 'Phiên làm việc đã xác thực'}
                  </p>
                </div>

                <div className="p-1.5 space-y-1">
                  {currentUser?.role !== 'viewer' && (
                    <Link
                      href={ROUTES.SETTINGS}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-400" />
                      Cấu hình hệ thống
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      clearAuthSession();
                      setProfileOpen(false);
                      toast.info(
                        'Đã đăng xuất',
                        'Phiên làm việc của bạn đã được xóa an toàn.',
                      );
                      router.replace(ROUTES.LOGIN);
                      router.refresh();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
      />
    </>
  );
}
