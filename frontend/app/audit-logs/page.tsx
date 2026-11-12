'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  Filter,
  History,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { StatusColorKey } from '@/constants';
import { useApi } from '@/hooks/useApi';
import type { AuditLog } from '@/types';

type ActionCategory = 'ALL' | 'UPLOAD' | 'DELETE' | 'SCAN' | 'RESTORE' | 'LOGIN';

const ACTION_CATEGORY_BADGE: Record<
  Exclude<ActionCategory, 'ALL'>,
  StatusColorKey
> = {
  UPLOAD: 'active',
  DELETE: 'failed',
  SCAN: 'running',
  RESTORE: 'completed',
  LOGIN: 'approved',
};

function classifyAuditAction(action: string): Exclude<ActionCategory, 'ALL'> {
  const lower = action.toLowerCase();
  if (lower.includes('upload')) return 'UPLOAD';
  if (lower.includes('delete')) return 'DELETE';
  if (
    lower.includes('scan') ||
    lower.includes('integrity') ||
    lower.includes('tamper')
  ) {
    return 'SCAN';
  }
  if (lower.includes('restore') || lower.includes('recovery')) {
    return 'RESTORE';
  }
  if (lower.includes('login') || lower.includes('logout')) {
    return 'LOGIN';
  }
  return 'SCAN';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function AuditLogsPage() {
  const { data: logs, loading, isMock } = useApi<AuditLog[]>('/audit-logs');

  const [actionFilter, setActionFilter] = useState<ActionCategory>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const filteredLogs = useMemo(() => {
    const list = logs ?? [];
    if (actionFilter === 'ALL') return list;
    return list.filter(
      (log) => classifyAuditAction(log.action) === actionFilter,
    );
  }, [logs, actionFilter]);

  const stats = useMemo(() => {
    const list = logs ?? [];
    const total = list.length;
    const success = list.filter((l) => l.status === 'success').length;
    const failure = list.filter((l) => l.status === 'failure').length;
    const securityEvents = list.filter(
      (l) => l.severity === 'critical' || l.severity === 'warning',
    ).length;

    return { total, success, failure, securityEvents };
  }, [logs]);

  const handleExportCsv = () => {
    const headers = [
      'Timestamp',
      'Actor',
      'Role',
      'Action Category',
      'Raw Action',
      'Entity Type',
      'Resource ID',
      'Resource Name',
      'IP Address',
      'Status',
      'Description',
    ];

    const rows = filteredLogs.map((log) => [
      log.createdAt,
      log.userEmail ?? 'system@docuguard.io',
      log.userRole ?? 'system',
      classifyAuditAction(log.action),
      log.action,
      log.entityType,
      log.entityId,
      log.entityName ?? '',
      log.ipAddress ?? '',
      log.status,
      log.description ?? '',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map(escapeCsvCell).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `docuguard-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = async (log: AuditLog) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 1800);
    } catch {
      // Bỏ qua nếu trình duyệt chặn clipboard
    }
  };

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (log) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {formatDateTime(log.createdAt)}
        </span>
      ),
    },
    {
      key: 'userEmail',
      header: 'Actor',
      render: (log) => (
        <div className="min-w-[160px]">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            {log.userEmail ?? 'system@docuguard.io'}
          </p>
          <p className="font-mono text-[11px] uppercase text-slate-400">
            {log.userRole ?? 'system'}
          </p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action Badge',
      render: (log) => {
        const category = classifyAuditAction(log.action);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Badge status={ACTION_CATEGORY_BADGE[category]} showDot>
                {category}
              </Badge>
              <Badge status={log.status} />
            </div>
            <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {log.action}
            </p>
          </div>
        );
      },
    },
    {
      key: 'entityId',
      header: 'Resource ID',
      render: (log) => (
        <div className="min-w-[150px]">
          <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-cyan-700 dark:text-cyan-300">
            {log.entityId}
          </code>
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400 max-w-[200px]">
            {log.entityName ?? log.entityType}
          </p>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {log.ipAddress ?? '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'payload',
      header: 'JSON Payload',
      align: 'right',
      render: (log) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setCopiedPayload(false);
            setSelectedLog(log);
          }}
          leftIcon={<Code2 className="h-3.5 w-3.5" />}
        >
          Xem JSON
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Audit Logs
            </h1>
            {isMock && (
              <Badge status="active" showDot>
                Immutable Stream
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Nhật ký kiểm toán bất biến ghi nhận toàn bộ truy cập, tải lên, quét rủi ro và khôi phục tài liệu.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={handleExportCsv}
          disabled={filteredLogs.length === 0}
          leftIcon={<Download className="h-4 w-4" />}
        >
          Export CSV
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng bản ghi nhật ký"
          value={stats.total}
          tone="cyan"
          loading={loading}
          icon={<History className="h-5 w-5" />}
          subtitle="Lưu trữ bất biến"
        />
        <StatCard
          title="Thao tác thành công"
          value={stats.success}
          tone="emerald"
          loading={loading}
          icon={<ShieldCheck className="h-5 w-5" />}
          subtitle="Verified operations"
        />
        <StatCard
          title="Lỗi / Bất thường"
          value={stats.failure}
          tone={stats.failure > 0 ? 'rose' : 'default'}
          loading={loading}
          icon={<ShieldAlert className="h-5 w-5" />}
          subtitle="Cần điều tra SOC"
        />
        <StatCard
          title="Cảnh báo bảo mật"
          value={stats.securityEvents}
          tone="amber"
          loading={loading}
          icon={<Terminal className="h-5 w-5" />}
          subtitle="Warning & Critical"
        />
      </div>

      {/* Action Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3.5 shadow-xs">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
          <Filter className="h-3.5 w-3.5" />
          Loại hành động:
        </span>
        {(
          ['ALL', 'UPLOAD', 'DELETE', 'SCAN', 'RESTORE', 'LOGIN'] as const
        ).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActionFilter(category)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
              actionFilter === category
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            ].join(' ')}
          >
            {category === 'ALL' ? 'Tất cả' : category}
          </button>
        ))}
      </div>

      {/* DataTable */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        loading={loading}
        searchable
        searchPlaceholder="Tìm kiếm actor, resource ID, IP hoặc mô tả..."
        searchPredicate={(log, q) =>
          (log.userEmail ?? '').toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entityId.toLowerCase().includes(q) ||
          (log.entityName ?? '').toLowerCase().includes(q) ||
          (log.ipAddress ?? '').toLowerCase().includes(q) ||
          (log.description ?? '').toLowerCase().includes(q)
        }
        filterLabel="Kết quả"
        filterKey="status"
        filterOptions={[
          { label: 'Success', value: 'success' },
          { label: 'Failure', value: 'failure' },
        ]}
        emptyTitle="Không có nhật ký kiểm toán phù hợp"
        emptyDescription="Thử thay đổi bộ lọc hành động hoặc từ khóa tìm kiếm."
      />

      {/* JSON Payload Detail Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Chi tiết Audit Log Payload (JSON)"
        description={
          selectedLog
            ? `${selectedLog.action} • ${formatDateTime(selectedLog.createdAt)}`
            : undefined
        }
        size="lg"
        footer={
          selectedLog && (
            <>
              <Button
                variant="secondary"
                onClick={() => void handleCopyJson(selectedLog)}
                leftIcon={
                  copiedPayload ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )
                }
              >
                {copiedPayload ? 'Đã sao chép JSON' : 'Sao chép JSON'}
              </Button>
              <Button variant="primary" onClick={() => setSelectedLog(null)}>
                Đóng
              </Button>
            </>
          )
        }
      >
        {selectedLog && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                status={
                  ACTION_CATEGORY_BADGE[classifyAuditAction(selectedLog.action)]
                }
                showDot
              >
                {classifyAuditAction(selectedLog.action)}
              </Badge>
              <Badge status={selectedLog.status} showDot />
              <span className="font-mono text-xs text-slate-500">
                IP: {selectedLog.ipAddress ?? '127.0.0.1'}
              </span>
            </div>

            <pre className="max-h-96 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-cyan-300">
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
