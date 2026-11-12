'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  FileText,
  History,
  LayoutDashboard,
  Lock,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NAV_ITEMS, ROUTES, type NavItem } from '@/constants';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  ShieldCheck,
  Activity,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  ScrollText,
  History,
  Workflow,
  Settings,
};

const SECTION_LABELS: Record<NavItem['section'], string> = {
  overview: 'Tổng quan',
  security: 'Giám sát & An ninh',
  operations: 'Vận hành & Hệ thống',
};

const SECTION_ORDER: NavItem['section'][] = [
  'overview',
  'security',
  'operations',
];

export interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname() ?? '';

  // Tự động đóng drawer trên mobile khi chuyển trang
  useEffect(() => {
    if (mobileOpen && onClose) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isActiveRoute = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200 border-r border-slate-800/80">
      {/* Brand Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-5">
        <Link
          href={ROUTES.DASHBOARD}
          className="flex items-center gap-3 group"
          onClick={onClose}
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-white/15">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">
                DocuGuard
              </span>
              <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/30">
                SOC
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Document Security Suite
            </p>
          </div>
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thanh điều hướng"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav
        aria-label="Điều hướng chính"
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
      >
        {SECTION_ORDER.map((section) => {
          const items = NAV_ITEMS.filter((item) => item.section === section);
          if (items.length === 0) return null;

          return (
            <div key={section}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {SECTION_LABELS[section]}
              </p>

              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = ICON_MAP[item.icon] ?? ShieldCheck;
                  const active = isActiveRoute(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={[
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                          active
                            ? 'bg-cyan-500/12 text-cyan-300 shadow-xs ring-1 ring-cyan-500/25'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
                        ].join(' ')}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400"
                            aria-hidden="true"
                          />
                        )}
                        <Icon
                          className={[
                            'h-4 w-4 shrink-0 transition-colors',
                            active
                              ? 'text-cyan-400'
                              : 'text-slate-500 group-hover:text-slate-300',
                          ].join(' ')}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer Security Status */}
      <div className="shrink-0 border-t border-slate-800/80 p-3.5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-200">
                Integrity Watch
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            Giám sát chữ ký SHA-256 &amp; tự động khôi phục 24/7.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-72 max-w-[82vw] flex-col shadow-2xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}
    </>
  );
}
