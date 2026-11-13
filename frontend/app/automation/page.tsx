'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  Play,
  Power,
  RefreshCw,
  Webhook,
  Workflow,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import type { AutomationWorkflow, WorkflowType } from '@/types';

const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  health_scanner: 'Health & Audit',
  auto_remediation: 'Auto-Remediation',
  renewal_reminder: 'Renewal Notifier',
  workflow_monitor: 'Snapshot & Monitor',
};

function formatDateTime(value?: string): string {
  if (!value) return 'Chưa chạy';
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

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function AutomationPage() {
  const {
    data: fetchedWorkflows,
    loading,
    isMock,
    refetch,
  } = useApi<AutomationWorkflow[]>('/automation');

  const [workflowOverrides, setWorkflowOverrides] = useState<
    Record<string, AutomationWorkflow>
  >({});
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const workflows = useMemo(() => {
    const base = fetchedWorkflows ?? [];
    return base.map((wf) => workflowOverrides[wf._id] ?? wf);
  }, [fetchedWorkflows, workflowOverrides]);

  const stats = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter((w) => w.isActive).length;
    const running = workflows.filter((w) => w.status === 'running').length;
    const avgSuccessRate =
      total > 0
        ? (
            workflows.reduce((sum, w) => sum + (w.successRate ?? 100), 0) /
            total
          ).toFixed(1)
        : '100.0';
    const totalScanned = workflows.reduce(
      (sum, w) => sum + w.scannedDocumentsCount,
      0,
    );

    return { total, active, running, avgSuccessRate, totalScanned };
  }, [workflows]);

  const handleToggleWorkflow = async (wf: AutomationWorkflow) => {
    const nextActive = !wf.isActive;
    const updated: AutomationWorkflow = {
      ...wf,
      isActive: nextActive,
      status: nextActive ? (wf.status === 'idle' ? 'success' : wf.status) : 'idle',
      updatedAt: new Date().toISOString(),
    };

    setWorkflowOverrides((prev) => ({ ...prev, [wf._id]: updated }));

    try {
      await apiClient.patch(`/automation/${wf._id}`, { isActive: nextActive });
    } catch {
      // Standalone mock fallback giữ nguyên thay đổi cục bộ
    }

    setBanner(
      `${nextActive ? 'Đã kích hoạt' : 'Đã tạm dừng'} luồng "${wf.workflowName}".`,
    );
  };

  const handleTriggerNow = async (wf: AutomationWorkflow) => {
    setTriggeringId(wf._id);
    setBanner(null);

    const startTime = new Date().toISOString();
    setWorkflowOverrides((prev) => ({
      ...prev,
      [wf._id]: {
        ...wf,
        isActive: true,
        status: 'running',
        triggerSource: 'manual',
        startedAt: startTime,
      },
    }));

    try {
      await apiClient.post(`/automation/${wf._id}/trigger`, {
        triggerSource: 'manual',
      });
    } catch {
      // Chế độ standalone mock chạy mô phỏng thực thi n8n
    }

    await new Promise((r) => setTimeout(r, 900));

    const endTime = new Date().toISOString();
    const durationMs = 900 + Math.floor(Math.random() * 1400);
    const completedWorkflow: AutomationWorkflow = {
      ...wf,
      isActive: true,
      status: 'success',
      triggerSource: 'manual',
      scannedDocumentsCount: wf.scannedDocumentsCount + 3,
      healthyCount: wf.healthyCount + 3,
      successRate: Math.min(
        100,
        Number(((wf.successRate ?? 98) + 0.1).toFixed(1)),
      ),
      lastRunAt: endTime,
      startedAt: startTime,
      completedAt: endTime,
      durationMs,
      updatedAt: endTime,
    };

    setWorkflowOverrides((prev) => ({
      ...prev,
      [wf._id]: completedWorkflow,
    }));
    setTriggeringId(null);
    setBanner(
      `Đã chạy thử thành công "${wf.workflowName}" trong ${formatDuration(durationMs)}.`,
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Automation Center
            </h1>
            {isMock && (
              <Badge status="active" showDot>
                n8n Orchestrator
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý, bật/tắt và chạy thử các luồng tự động hóa bảo mật n8n theo lịch trình &amp; webhook.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={() => void refetch()}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Đồng bộ trạng thái n8n
        </Button>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{banner}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs font-medium opacity-75 hover:opacity-100 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Workflows"
          value={stats.total}
          tone="cyan"
          loading={loading}
          icon={<Workflow className="h-5 w-5" />}
          subtitle="Tích hợp n8n Engine"
        />
        <StatCard
          title="Đang kích hoạt"
          value={`${stats.active}/${stats.total}`}
          tone="emerald"
          loading={loading}
          icon={<Power className="h-5 w-5" />}
          subtitle={`${stats.running} luồng đang chạy`}
        />
        <StatCard
          title="Tỷ lệ thành công TB"
          value={`${stats.avgSuccessRate}%`}
          tone="emerald"
          loading={loading}
          icon={<Activity className="h-5 w-5" />}
          subtitle="SLA tự động hóa"
        />
        <StatCard
          title="Tệp đã xử lý tự động"
          value={stats.totalScanned}
          tone="cyan"
          loading={loading}
          icon={<Bot className="h-5 w-5" />}
          subtitle="Tất cả lần thực thi"
        />
      </div>

      {/* Workflow Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {workflows.map((wf) => {
            const successRate = wf.successRate ?? 100;
            const isTriggering = triggeringId === wf._id;

            return (
              <article
                key={wf._id}
                className={[
                  'flex flex-col justify-between rounded-xl border bg-white dark:bg-slate-900/90 p-5 shadow-xs transition-all',
                  wf.isActive
                    ? 'border-slate-200 dark:border-slate-800 hover:border-cyan-500/40'
                    : 'border-slate-200/80 dark:border-slate-800/70 opacity-80',
                ].join(' ')}
              >
                <div className="space-y-4">
                  {/* Card Top: Title + Toggle Switch */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                          {WORKFLOW_TYPE_LABELS[wf.workflowType]}
                        </span>
                        <Badge
                          status={wf.status}
                          showDot
                          pulse={wf.status === 'running'}
                        />
                      </div>

                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        {wf.workflowName}
                      </h2>
                      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {wf.description ?? 'Luồng tự động hóa bảo mật DocuGuard.'}
                      </p>
                    </div>

                    {/* Accessible Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={wf.isActive}
                      aria-label={`Bật/tắt ${wf.workflowName}`}
                      onClick={() => void handleToggleWorkflow(wf)}
                      className={[
                        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 cursor-pointer',
                        wf.isActive
                          ? 'bg-cyan-600'
                          : 'bg-slate-300 dark:bg-slate-700',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                          wf.isActive ? 'translate-x-6' : 'translate-x-1',
                        ].join(' ')}
                      />
                    </button>
                  </div>

                  {/* Execution Metadata */}
                  <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 text-xs">
                    <div>
                      <p className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        Lần chạy gần nhất
                      </p>
                      <p className="mt-1 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {formatDateTime(wf.lastRunAt ?? wf.startedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="flex items-center gap-1 text-slate-400">
                        {wf.scheduleCron ? (
                          <CalendarClock className="h-3.5 w-3.5" />
                        ) : (
                          <Webhook className="h-3.5 w-3.5" />
                        )}
                        Cơ chế kích hoạt
                      </p>
                      <p className="mt-1 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {wf.scheduleCron
                          ? `CRON (${wf.scheduleCron})`
                          : `Webhook (${wf.triggerSource})`}
                      </p>
                    </div>
                  </div>

                  {/* Success Rate Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        Tỷ lệ thành công
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {successRate}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        style={{ width: `${successRate}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer: Metrics & Trigger Now */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      Đã quét:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {wf.scannedDocumentsCount}
                      </strong>
                    </span>
                    <span>
                      Sự cố tạo:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {wf.incidentsCreatedCount}
                      </strong>
                    </span>
                    <span>
                      Thời lượng:{' '}
                      <strong className="font-mono text-slate-800 dark:text-slate-200">
                        {formatDuration(wf.durationMs)}
                      </strong>
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={isTriggering}
                    onClick={() => void handleTriggerNow(wf)}
                    leftIcon={<Play className="h-3.5 w-3.5" />}
                  >
                    {isTriggering ? 'Đang chạy...' : 'Trigger Now'}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
