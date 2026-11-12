'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  DatabaseBackup,
  FileCheck2,
  FileText,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import { useApi } from '@/hooks/useApi';
import { apiClient, normalizeApiError } from '@/lib/api';
import type {
  AuditLog,
  DashboardSummary,
  Document,
  Incident,
  RecoveryPoint,
} from '@/types';

interface TrendDayPoint {
  day: string;
  dateLabel: string;
  scans: number;
  risks: number;
  avgScore: number;
}

const SEVEN_DAY_TREND: TrendDayPoint[] = [
  { day: 'T2', dateLabel: '06/11', scans: 42, risks: 2, avgScore: 91 },
  { day: 'T3', dateLabel: '07/11', scans: 45, risks: 1, avgScore: 93 },
  { day: 'T4', dateLabel: '08/11', scans: 46, risks: 3, avgScore: 86 },
  { day: 'T5', dateLabel: '09/11', scans: 47, risks: 2, avgScore: 88 },
  { day: 'T6', dateLabel: '10/11', scans: 48, risks: 4, avgScore: 79 },
  { day: 'T7', dateLabel: '11/11', scans: 48, risks: 2, avgScore: 82 },
  { day: 'CN', dateLabel: '12/11', scans: 51, risks: 3, avgScore: 76 },
];

type RawDashboardStats = DashboardSummary & {
  averageHealthScore?: number;
  activeIncidents?: number;
  recentIncidents?: Incident[];
};

function formatDateTime(value?: string): string {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function DashboardPage() {
  const [hoveredDay, setHoveredDay] = useState<TrendDayPoint | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  const {
    data: stats,
    loading: statsLoading,
    isMock: statsIsMock,
    refetch: refetchStats,
  } = useApi<RawDashboardStats>('/dashboard/stats');

  const {
    data: documents,
    loading: docsLoading,
    refetch: refetchDocs,
  } = useApi<Document[]>('/documents');

  const {
    data: incidents,
    loading: incidentsLoading,
    refetch: refetchIncidents,
  } = useApi<Incident[]>('/incidents');

  const {
    data: recoveries,
    loading: recoveriesLoading,
    refetch: refetchRecoveries,
  } = useApi<RecoveryPoint[]>('/recovery');

  const {
    data: auditLogs,
    loading: auditLoading,
    refetch: refetchAudits,
  } = useApi<AuditLog[]>('/audit-logs');

  const totalProtectedDocs =
    stats?.totalDocuments ?? documents?.length ?? 0;

  const healthScorePercent =
    stats?.overallHealthScore ?? stats?.averageHealthScore ?? 0;

  const openIncidentsList = useMemo(
    () =>
      (incidents ?? []).filter(
        (inc) => inc.status === 'open' || inc.status === 'in_progress',
      ),
    [incidents],
  );

  const openIncidentsCount =
    stats?.openIncidents ?? stats?.activeIncidents ?? openIncidentsList.length;

  const criticalAndRecentIncidents = useMemo(() => {
    const list = incidents ?? stats?.recentIncidents ?? [];
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return [...list]
      .sort(
        (a, b) =>
          (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9),
      )
      .slice(0, 5);
  }, [incidents, stats]);

  const latestSafeBackup = useMemo(() => {
    const completed = (recoveries ?? []).filter(
      (item) => item.status === 'completed',
    );
    const sorted = [...(completed.length > 0 ? completed : recoveries ?? [])].sort(
      (a, b) =>
        new Date(b.restoredAt ?? b.createdAt).getTime() -
        new Date(a.restoredAt ?? a.createdAt).getTime(),
    );
    return sorted[0] ?? null;
  }, [recoveries]);

  const maxScans = useMemo(
    () => Math.max(...SEVEN_DAY_TREND.map((d) => d.scans), 1),
    [],
  );

  const healthTone =
    healthScorePercent >= 80
      ? 'emerald'
      : healthScorePercent >= 60
        ? 'amber'
        : 'rose';

  const handleRefreshAll = async () => {
    setActionMessage(null);
    await Promise.all([
      refetchStats(),
      refetchDocs(),
      refetchIncidents(),
      refetchRecoveries(),
      refetchAudits(),
    ]);
    setActionMessage({
      type: 'info',
      text: 'Đã làm mới toàn bộ dữ liệu giám sát từ hệ thống.',
    });
  };

  const handleRunHealthScan = async () => {
    setScanning(true);
    setActionMessage(null);
    try {
      await apiClient.post('/health-scanner/scan', { triggerSource: 'manual' });
      await handleRefreshAll();
      setActionMessage({
        type: 'success',
        text: 'Đã kích hoạt quét sức khỏe & kiểm tra toàn vẹn SHA-256 cho toàn bộ kho tài liệu.',
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: normalizeApiError(err),
      });
    } finally {
      setScanning(false);
    }
  };

  const auditColumns: DataTableColumn<AuditLog>[] = [
    {
      key: 'action',
      header: 'Hành động',
      render: (log) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            {log.action}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
            {log.description ?? log.entityName ?? log.entityId}
          </p>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Đối tượng',
      render: (log) => (
        <div className="text-xs">
          <span className="font-medium capitalize text-slate-800 dark:text-slate-200">
            {log.entityType}
          </span>
          <p className="font-mono text-[11px] text-slate-400">
            {log.entityId}
          </p>
        </div>
      ),
    },
    {
      key: 'userEmail',
      header: 'Tác nhân / IP',
      render: (log) => (
        <div className="text-xs">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {log.userEmail ?? 'system@docuguard.io'}
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            {log.ipAddress ?? '127.0.0.1'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Kết quả',
      render: (log) => (
        <Badge status={log.status} showDot />
      ),
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      align: 'right',
      render: (log) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatRelativeTime(log.createdAt)}
        </span>
      ),
    },
  ];

  const activePoint = hoveredDay ?? SEVEN_DAY_TREND[SEVEN_DAY_TREND.length - 1];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Title & Quick Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Security Operations Dashboard
            </h1>
            {statsIsMock && (
              <Badge status="active" showDot>
                Mock Mode
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Giám sát toàn vẹn tài liệu SHA-256, xu hướng rủi ro và khôi phục sự cố theo thời gian thực.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefreshAll}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Làm mới
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={scanning}
            onClick={handleRunHealthScan}
            leftIcon={<ScanSearch className="h-4 w-4" />}
          >
            Quét sức khỏe ngay
          </Button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionMessage && (
        <div
          role="status"
          className={[
            'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
            actionMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : actionMessage.type === 'error'
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-medium opacity-75 hover:opacity-100 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Top Row: 4 StatCards */}
      <section aria-label="Chỉ số bảo mật tổng quan" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng tài liệu được bảo vệ"
          value={totalProtectedDocs}
          tone="cyan"
          loading={statsLoading && docsLoading}
          icon={<FileCheck2 className="h-5 w-5" />}
          trend={{
            value: '+3 tuần này',
            direction: 'up',
            label: 'SHA-256 indexed',
          }}
          subtitle={`${stats?.healthyDocuments ?? 0} khỏe mạnh`}
        />

        <StatCard
          title="Điểm sức khỏe hệ thống"
          value={`${healthScorePercent}%`}
          tone={healthTone}
          loading={statsLoading}
          icon={<Activity className="h-5 w-5" />}
          trend={{
            value: healthScorePercent >= 80 ? 'Ổn định' : 'Cần rà soát',
            direction: healthScorePercent >= 80 ? 'up' : 'down',
            label: '5 luật chấm điểm',
          }}
          subtitle="Ngưỡng an toàn ≥ 80%"
        />

        <StatCard
          title="Sự cố đang mở"
          value={openIncidentsCount}
          tone={openIncidentsCount > 0 ? 'rose' : 'emerald'}
          loading={statsLoading && incidentsLoading}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={{
            value:
              openIncidentsList.filter((i) => i.severity === 'critical').length > 0
                ? `${openIncidentsList.filter((i) => i.severity === 'critical').length} nghiêm trọng`
                : 'Không có critical',
            direction: openIncidentsCount > 0 ? 'down' : 'neutral',
          }}
          subtitle="Giám sát SLA 24/7"
        />

        <StatCard
          title="Bản sao lưu an toàn gần nhất"
          value={
            latestSafeBackup
              ? formatRelativeTime(
                  latestSafeBackup.restoredAt ?? latestSafeBackup.createdAt,
                )
              : 'Sẵn sàng'
          }
          tone="emerald"
          loading={recoveriesLoading}
          icon={<DatabaseBackup className="h-5 w-5" />}
          trend={{
            value: latestSafeBackup?.recoveryCode ?? 'Vault Sync',
            direction: 'up',
            label: '1-Click Recovery',
          }}
          subtitle={latestSafeBackup?.department ?? 'Toàn vẹn 100%'}
        />
      </section>

      {/* Middle Section: 7-Day Scan & Risk Trend Chart + Recent Critical Incidents */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 7-Day Trend Chart */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Xu hướng quét &amp; phát hiện rủi ro (7 ngày qua)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                So sánh lượt kiểm tra SHA-256 định kỳ và số bất thường phát hiện mỗi ngày.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-xs bg-cyan-500" />
                Lượt quét
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
                Rủi ro phát hiện
              </span>
            </div>
          </div>

          {/* Interactive SVG + CSS Bar/Line Visualization */}
          <div className="mt-5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50 p-4">
            {/* Active Day Readout */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Ngày {activePoint.day} ({activePoint.dateLabel})
              </span>
              <div className="flex items-center gap-4 tabular-nums">
                <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                  Quét: <strong>{activePoint.scans}</strong> tệp
                </span>
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  Rủi ro: <strong>{activePoint.risks}</strong> cảnh báo
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Health TB: <strong>{activePoint.avgScore}%</strong>
                </span>
              </div>
            </div>

            {/* Chart Bars + SVG Risk Overlay */}
            <div className="relative h-48 pt-4">
              {/* Horizontal Guide Lines */}
              <div className="pointer-events-none absolute inset-x-0 top-4 bottom-7 flex flex-col justify-between">
                {[100, 66, 33, 0].map((mark) => (
                  <div
                    key={mark}
                    className="border-b border-dashed border-slate-200 dark:border-slate-800/90"
                  />
                ))}
              </div>

              {/* Bars */}
              <div className="relative z-10 grid h-full grid-cols-7 items-end gap-2 sm:gap-4 pb-7">
                {SEVEN_DAY_TREND.map((point) => {
                  const scanHeightPct = Math.max(
                    14,
                    Math.round((point.scans / maxScans) * 100),
                  );
                  const riskHeightPct = Math.max(
                    8,
                    Math.min(100, point.risks * 20),
                  );
                  const isSelected = activePoint.day === point.day;

                  return (
                    <button
                      key={point.day}
                      type="button"
                      onMouseEnter={() => setHoveredDay(point)}
                      onFocus={() => setHoveredDay(point)}
                      className={[
                        'group relative flex h-full flex-col items-center justify-end rounded-lg px-1 pt-2 transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-cyan-500/8 dark:bg-cyan-500/10'
                          : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/40',
                      ].join(' ')}
                    >
                      <div className="flex h-full w-full items-end justify-center gap-1.5">
                        <div
                          style={{ height: `${scanHeightPct}%` }}
                          className="w-3 sm:w-4 rounded-t-md bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-300 group-hover:brightness-110"
                          title={`${point.scans} lượt quét`}
                        />
                        <div
                          style={{ height: `${riskHeightPct}%` }}
                          className="w-2.5 sm:w-3 rounded-t-md bg-gradient-to-t from-rose-600 to-amber-400 transition-all duration-300 group-hover:brightness-110"
                          title={`${point.risks} rủi ro`}
                        />
                      </div>

                      <span className="absolute -bottom-6 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {point.day}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tổng lượt quét 7 ngày: 327 tài liệu</span>
            <Link
              href={ROUTES.HEALTH_SCANNER}
              className="inline-flex items-center gap-1 font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Mở Health Scanner
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Recent Critical Incidents */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Sự cố nghiêm trọng gần đây
              </h2>
            </div>
            <Link
              href={ROUTES.INCIDENTS}
              className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Quản lý sự cố
            </Link>
          </div>

          <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 p-5">
            {incidentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : criticalAndRecentIncidents.length > 0 ? (
              criticalAndRecentIncidents.map((inc) => (
                <div
                  key={inc._id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                        {inc.incidentCode}
                      </span>
                      <Badge
                        severity={inc.severity}
                        showDot
                        pulse={inc.severity === 'critical'}
                      />
                    </div>
                    <Badge status={inc.status} />
                  </div>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">
                    {inc.title}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Phát hiện: {formatDateTime(inc.createdAt)}</span>
                    {inc.slaDeadline && (
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        SLA: {formatRelativeTime(inc.slaDeadline)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <ShieldCheck className="h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Không có sự cố nghiêm trọng nào
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tất cả tệp đang ở trạng thái giám sát an toàn.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom Section: Latest Audit Logs + Quick Actions */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Nhật ký hoạt động mới nhất
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Theo dõi các sự kiện toàn vẹn tệp, phê duyệt khôi phục và workflow tự động.
              </p>
            </div>
            <Link
              href={ROUTES.AUDIT_LOGS}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Xem toàn bộ Audit Log
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <DataTable
            data={auditLogs ?? []}
            columns={auditColumns}
            loading={auditLoading}
            searchable
            searchPlaceholder="Lọc theo hành động, đối tượng hoặc email..."
            filterLabel="Trạng thái"
            filterKey="status"
            filterOptions={[
              { label: 'Thành công', value: 'success' },
              { label: 'Thất bại', value: 'failure' },
            ]}
            emptyTitle="Chưa có nhật ký hoạt động"
            emptyDescription="Các thao tác bảo mật sẽ được ghi nhận tự động tại đây."
          />
        </div>

        {/* Quick Actions Panel */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Thao tác nhanh
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Điều hướng nhanh tới các tác vụ phản ứng sự cố &amp; bảo vệ tài liệu.
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              <Button
                variant="primary"
                fullWidth
                loading={scanning}
                onClick={handleRunHealthScan}
                leftIcon={<ScanSearch className="h-4 w-4" />}
              >
                Quét toàn vẹn hệ thống
              </Button>

              <Link href={ROUTES.DOCUMENTS} className="block">
                <Button
                  variant="secondary"
                  fullWidth
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  Tải lên tài liệu mới
                </Button>
              </Link>

              <Link href={ROUTES.RECOVERY} className="block">
                <Button
                  variant="secondary"
                  fullWidth
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Safe Recovery 1-Click
                </Button>
              </Link>

              <Link href={ROUTES.INCIDENTS} className="block">
                <Button
                  variant="danger"
                  fullWidth
                  leftIcon={<ShieldAlert className="h-4 w-4" />}
                >
                  Xử lý sự cố ({openIncidentsCount})
                </Button>
              </Link>

              <Link href={ROUTES.AUTOMATION} className="block">
                <Button
                  variant="ghost"
                  fullWidth
                  leftIcon={<FileText className="h-4 w-4" />}
                >
                  Kiểm tra n8n Workflows
                </Button>
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
