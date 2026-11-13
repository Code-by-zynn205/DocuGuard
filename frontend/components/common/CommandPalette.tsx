'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  FileText,
  ScrollText,
  Search,
  X,
} from 'lucide-react';
import { NAV_ITEMS, ROUTES } from '@/constants';
import { useApi } from '@/hooks/useApi';
import { Badge } from '@/components/ui/Badge';
import type { AuditLog, Document, Incident } from '@/types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandResultItem {
  id: string;
  group: 'pages' | 'documents' | 'incidents' | 'auditLogs';
  title: string;
  subtitle: string;
  href: string;
  badge?:
    | { kind: 'status'; value: Document['integrityStatus'] | AuditLog['status'] }
    | { kind: 'severity'; value: Incident['severity'] };
}

const GROUP_META: Record<
  CommandResultItem['group'],
  { label: string; icon: typeof Compass }
> = {
  pages: { label: 'Trang & Module', icon: Compass },
  documents: { label: 'Tài liệu (Document Vault)', icon: FileText },
  incidents: { label: 'Sự cố bảo mật (Incidents)', icon: AlertTriangle },
  auditLogs: { label: 'Nhật ký kiểm toán (Audit Logs)', icon: ScrollText },
};

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data: documents } = useApi<Document[]>('/documents', {
    enabled: isOpen,
  });
  const { data: incidents } = useApi<Incident[]>('/incidents', {
    enabled: isOpen,
  });
  const { data: auditLogs } = useApi<AuditLog[]>('/audit-logs', {
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 20);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const results = useMemo<CommandResultItem[]>(() => {
    const q = query.trim().toLowerCase();

    const pageItems: CommandResultItem[] = NAV_ITEMS.filter(
      (item) =>
        !q ||
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.href.toLowerCase().includes(q),
    ).map((item) => ({
      id: `page:${item.href}`,
      group: 'pages',
      title: item.label,
      subtitle: `${item.description} (${item.href})`,
      href: item.href,
    }));

    const docItems: CommandResultItem[] = (documents ?? [])
      .filter(
        (doc) =>
          !q ||
          doc.title.toLowerCase().includes(q) ||
          doc.originalFileName.toLowerCase().includes(q) ||
          doc.department.toLowerCase().includes(q) ||
          doc.fileHash.toLowerCase().includes(q),
      )
      .slice(0, q ? 5 : 3)
      .map((doc) => ({
        id: `doc:${doc._id}`,
        group: 'documents',
        title: doc.title,
        subtitle: `${doc.originalFileName} • ${doc.department}`,
        href: ROUTES.DOCUMENTS,
        badge: { kind: 'status', value: doc.integrityStatus },
      }));

    const incidentItems: CommandResultItem[] = (incidents ?? [])
      .filter(
        (inc) =>
          !q ||
          inc.incidentCode.toLowerCase().includes(q) ||
          inc.title.toLowerCase().includes(q) ||
          inc.severity.toLowerCase().includes(q),
      )
      .slice(0, q ? 5 : 2)
      .map((inc) => ({
        id: `inc:${inc._id}`,
        group: 'incidents',
        title: `${inc.incidentCode} — ${inc.title}`,
        subtitle: inc.description,
        href: ROUTES.INCIDENTS,
        badge: { kind: 'severity', value: inc.severity },
      }));

    const logItems: CommandResultItem[] = (auditLogs ?? [])
      .filter(
        (log) =>
          !q ||
          log.action.toLowerCase().includes(q) ||
          (log.entityName ?? '').toLowerCase().includes(q) ||
          (log.userEmail ?? '').toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q),
      )
      .slice(0, q ? 5 : 2)
      .map((log) => ({
        id: `log:${log._id}`,
        group: 'auditLogs',
        title: log.action,
        subtitle: `${log.userEmail ?? 'system'} • ${log.entityName ?? log.entityId}`,
        href: ROUTES.AUDIT_LOGS,
        badge: { kind: 'status', value: log.status },
      }));

    return [...pageItems, ...docItems, ...incidentItems, ...logItems];
  }, [query, documents, incidents, auditLogs]);

  const safeActiveIndex =
    results.length > 0 ? Math.min(activeIndex, results.length - 1) : 0;

  const handleSelect = (item: CommandResultItem) => {
    setQuery('');
    setActiveIndex(0);
    onClose();
    router.push(item.href);
  };

  if (!isOpen) return null;

  const groupedOrder: CommandResultItem['group'][] = [
    'pages',
    'documents',
    'incidents',
    'auditLogs',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-950/50">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-cyan-500" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (results.length > 0) {
                  setActiveIndex((prev) => (prev + 1) % results.length);
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (results.length > 0) {
                  setActiveIndex(
                    (prev) => (prev - 1 + results.length) % results.length,
                  );
                }
              } else if (e.key === 'Enter' && results[safeActiveIndex]) {
                e.preventDefault();
                handleSelect(results[safeActiveIndex]);
              }
            }}
            placeholder="Tìm nhanh trang, tài liệu, mã sự cố hoặc audit log..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Command Palette"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2.5 space-y-3">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Không tìm thấy kết quả phù hợp cho &ldquo;{query}&rdquo;
            </div>
          ) : (
            groupedOrder.map((group) => {
              const items = results.filter((r) => r.group === group);
              if (items.length === 0) return null;
              const Meta = GROUP_META[group];
              const GroupIcon = Meta.icon;

              return (
                <div key={group} className="space-y-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <GroupIcon className="h-3.5 w-3.5" />
                    <span>{Meta.label}</span>
                  </div>

                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const flatIdx = results.findIndex((r) => r.id === item.id);
                      const isActive = flatIdx === safeActiveIndex;

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => handleSelect(item)}
                            className={[
                              'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer',
                              isActive
                                ? 'bg-cyan-500/12 text-slate-900 dark:text-white ring-1 ring-cyan-500/30'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70',
                            ].join(' ')}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold">
                                {item.title}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {item.subtitle}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {item.badge?.kind === 'status' && (
                                <Badge status={item.badge.value} showDot />
                              )}
                              {item.badge?.kind === 'severity' && (
                                <Badge severity={item.badge.value} showDot />
                              )}
                              <ArrowRight
                                className={`h-3.5 w-3.5 transition-transform ${
                                  isActive
                                    ? 'translate-x-0.5 text-cyan-500'
                                    : 'text-slate-400'
                                }`}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-slate-300 dark:border-slate-700 px-1 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              Di chuyển
            </span>
            <span>
              <kbd className="rounded border border-slate-300 dark:border-slate-700 px-1 py-0.5 font-mono text-[10px]">
                Enter
              </kbd>{' '}
              Mở
            </span>
          </div>
          <span>
            <kbd className="rounded border border-slate-300 dark:border-slate-700 px-1 py-0.5 font-mono text-[10px]">
              ESC
            </kbd>{' '}
            Đóng
          </span>
        </div>
      </div>
    </div>
  );
}
