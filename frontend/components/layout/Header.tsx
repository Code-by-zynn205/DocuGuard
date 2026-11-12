'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bell,
  ChevronRight,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { NAV_ITEMS, ROUTES } from '@/constants';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/ui/Badge';
import type { Incident, SystemHealthCheck } from '@/types';

export interface HeaderProps {
  onMenuClick?: () => void;
}

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

  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const { data: healthData, isMock: isMockHealth } =
    useApi<SystemHealthCheck>('/health');
  const { data: incidentsData } = useApi<Incident[]>('/incidents');

  // Phím tắt Ctrl+K / Cmd+K mở ô tìm kiếm nhanh
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === 'Escape') {
        setSearchFocused(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
        searchInputRef.current?.blur();
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

  const quickNavResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q),
    );
  }, [searchTerm]);

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
        ? 'Standalone Mock'
        : 'System Online'
      : healthData?.status === 'degraded'
        ? 'Degraded'
        : 'Connecting...';

  const systemDotClass =
    healthData?.status === 'ok'
      ? isMockHealth
        ? 'bg-cyan-500'
        : 'bg-emerald-500'
      : healthData?.status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-slate-400';

  const handleSelectQuickRoute = (href: string) => {
    setSearchTerm('');
    setSearchFocused(false);
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 px-4 sm:px-6 backdrop-blur-md">
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

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
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

      {/* Right: Quick Search + System Status + Notifications + Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Search */}
        <div className="relative hidden md:block w-64 lg:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && quickNavResults.length > 0) {
                handleSelectQuickRoute(quickNavResults[0].href);
              }
            }}
            placeholder="Tìm nhanh module..."
            aria-label="Tìm kiếm nhanh"
            className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 pl-9 pr-14 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Ctrl K
          </kbd>

          {searchFocused && (
            <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className="border-b border-slate-100 dark:border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Điều hướng nhanh
              </div>
              <ul className="max-h-64 overflow-y-auto py-1">
                {quickNavResults.length > 0 ? (
                  quickNavResults.map((item) => (
                    <li key={item.href}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectQuickRoute(item.href);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-cyan-500/10 cursor-pointer"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.href}
                        </span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-4 text-center text-xs text-slate-500">
                    Không tìm thấy module phù hợp
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* System Status Pill */}
        <div
          title={`Backend: ${healthData?.checks?.server ?? 'checking'} | DB: ${healthData?.checks?.database ?? 'checking'} | n8n: ${healthData?.checks?.n8n ?? 'checking'}`}
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
          <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span className="whitespace-nowrap">{systemStatusLabel}</span>
        </div>

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
              AD
            </div>
            <div className="hidden text-left sm:block leading-tight">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Security Admin
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                SOC Operator
              </p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
              <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-3">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  admin@docuguard.io
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <UserCheck className="h-3 w-3" />
                  Phiên làm việc đã xác thực
                </p>
              </div>
              <div className="p-1.5">
                <Link
                  href={ROUTES.SETTINGS}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  Cấu hình hệ thống
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
