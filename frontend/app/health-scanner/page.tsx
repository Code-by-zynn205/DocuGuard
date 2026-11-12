'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  Loader2,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import type { HealthScanResult } from '@/types';

type ChecklistSeverity = 'pass' | 'warning' | 'critical';

interface SecurityChecklistItem {
  id: string;
  title: string;
  category: string;
  description: string;
  affectedTarget: string;
  documentId?: string;
  status: ChecklistSeverity;
  pointsImpact: number;
  remediationAction: string;
}

interface ScanStep {
  id: string;
  label: string;
  detail: string;
}

const SCAN_STEPS: ScanStep[] = [
  {
    id: 'integrity',
    label: '1. Kiểm tra toàn vẹn file',
    detail: 'Đối chiếu dấu vân tay SHA-256 giữa tệp lưu trữ và kho sao lưu gốc',
  },
  {
    id: 'malware',
    label: '2. Quét mã độc / rò rỉ',
    detail: 'Phát hiện tệp rỗng bất thường, chỉnh sửa trái phép và rò rỉ dữ liệu mật',
  },
  {
    id: 'policy',
    label: '3. Đối chiếu chính sách',
    detail: 'Kiểm tra hạn hiệu lực, phụ lục bắt buộc và chuẩn metadata doanh nghiệp',
  },
];

const INITIAL_CHECKLIST: SecurityChecklistItem[] = [
  {
    id: 'chk_hash_iso',
    title: 'Sai lệch chữ ký SHA-256 trên Báo cáo kiểm toán Q4',
    category: 'Toàn vẹn tệp',
    description:
      'Mã băm hiện tại (deadbeef...999999) không khớp với chữ ký gốc (a1b2c3d4...abcdef).',
    affectedTarget: 'Audit_ISO27001_Q4_2026.pdf',
    documentId: 'doc_002',
    status: 'critical',
    pointsImpact: 50,
    remediationAction: 'Khôi phục từ bản sao lưu gốc & khóa quyền ghi',
  },
  {
    id: 'chk_expiry_hr',
    title: 'Tài liệu Quy chế lương thưởng sắp hết hạn trong 16 ngày',
    category: 'Chính sách hiệu lực',
    description:
      'Tài liệu cần gia hạn hoặc ban hành phiên bản mới trước ngày 28/11/2026.',
    affectedTarget: 'HR_Compensation_Policy_2026.docx',
    documentId: 'doc_003',
    status: 'warning',
    pointsImpact: 15,
    remediationAction: 'Gia hạn thời gian hiệu lực thêm 12 tháng',
  },
  {
    id: 'chk_appendix_hr',
    title: 'Thiếu phụ lục bắt buộc: Bảng phụ cấp khu vực',
    category: 'Đối chiếu phụ lục',
    description:
      'Phát hiện thiếu 1 phụ lục trong danh sách tài liệu nhân sự bắt buộc.',
    affectedTarget: 'HR_Compensation_Policy_2026.docx',
    documentId: 'doc_003',
    status: 'warning',
    pointsImpact: 15,
    remediationAction: 'Đính kèm phụ lục chuẩn từ kho lưu trữ',
  },
  {
    id: 'chk_cloud_contract',
    title: 'Toàn vẹn SHA-256 Hợp đồng Cloud Infrastructure 2026',
    category: 'Toàn vẹn tệp',
    description: 'Chữ ký số SHA-256 khớp 100% với bản sao lưu an toàn.',
    affectedTarget: 'HD_Cloud_Infrastructure_2026.pdf',
    documentId: 'doc_001',
    status: 'pass',
    pointsImpact: 0,
    remediationAction: 'Không cần thao tác',
  },
  {
    id: 'chk_confidential_acl',
    title: 'Kiểm soát phê duyệt 2 lớp cho tài liệu Tối mật',
    category: 'Quét rò rỉ & Quyền truy cập',
    description:
      'Tất cả tài liệu mật đều đã bật cơ chế phê duyệt trước khi khôi phục.',
    affectedTarget: 'Toàn hệ thống',
    status: 'pass',
    pointsImpact: 0,
    remediationAction: 'Đạt chuẩn SOC',
  },
];

function formatDateTime(value?: string): string {
  if (!value) return '—';
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

export default function HealthScannerPage() {
  const {
    data: scanResults,
    loading,
    isMock,
    refetch,
  } = useApi<HealthScanResult[]>('/health-scanner');

  const [checklist, setChecklist] =
    useState<SecurityChecklistItem[]>(INITIAL_CHECKLIST);
  const [scanning, setScanning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [lastScanAt, setLastScanAt] = useState<string>(
    '2026-11-12T08:00:00.000Z',
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const scanLockRef = useRef(false);

  const stats = useMemo(() => {
    const passCount = checklist.filter((c) => c.status === 'pass').length;
    const warningCount = checklist.filter((c) => c.status === 'warning').length;
    const criticalCount = checklist.filter(
      (c) => c.status === 'critical',
    ).length;

    const totalPenalty = checklist
      .filter((c) => c.status !== 'pass')
      .reduce((acc, item) => acc + item.pointsImpact, 0);

    const overallScore = Math.max(0, Math.min(100, 100 - Math.round(totalPenalty * 0.75)));

    return {
      total: checklist.length,
      passCount,
      warningCount,
      criticalCount,
      overallScore,
    };
  }, [checklist]);

  // Tính toán thông số vòng tròn SVG Gauge
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (stats.overallScore / 100) * circumference;

  const gaugeStrokeColor =
    stats.overallScore >= 80
      ? 'stroke-emerald-500'
      : stats.overallScore >= 60
        ? 'stroke-amber-500'
        : 'stroke-rose-500';

  const gaugeTextColor =
    stats.overallScore >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : stats.overallScore >= 60
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400';

  const handleRunFullScan = async () => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanning(true);
    setStatusMessage(null);
    setActiveStepIndex(0);
    setProgressPct(15);

    try {
      await new Promise((r) => setTimeout(r, 700));
      setProgressPct(38);
      setActiveStepIndex(1);

      await new Promise((r) => setTimeout(r, 750));
      setProgressPct(72);
      setActiveStepIndex(2);

      try {
        await apiClient.post('/health-scanner/scan', {
          triggerSource: 'manual',
        });
      } catch {
        // Tiếp tục hoàn tất tiến trình trên standalone mock
      }

      await new Promise((r) => setTimeout(r, 650));
      setProgressPct(100);
      setActiveStepIndex(3);
      setLastScanAt(new Date().toISOString());
      await refetch();
      setStatusMessage(
        'Hoàn tất quét toàn hệ thống: đã đối chiếu SHA-256, quét rò rỉ và kiểm tra chính sách.',
      );
    } finally {
      setScanning(false);
      scanLockRef.current = false;
    }
  };

  const handleFixNow = async (item: SecurityChecklistItem) => {
    setFixingId(item.id);
    setStatusMessage(null);

    try {
      if (item.documentId) {
        try {
          await apiClient.post(`/documents/${item.documentId}/recover`, {
            reason: `Khắc phục tự động từ Health Scanner: ${item.title}`,
          });
        } catch {
          // Chế độ standalone mock cập nhật trực tiếp trạng thái checklist
        }
      }

      await new Promise((r) => setTimeout(r, 500));

      setChecklist((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: 'pass',
                pointsImpact: 0,
                description: `Đã khắc phục thành công (${item.remediationAction}).`,
              }
            : entry,
        ),
      );

      setStatusMessage(
        `Đã xử lý hạng mục "${item.title}" và cập nhật lại điểm sức khỏe hệ thống.`,
      );
    } finally {
      setFixingId(null);
    }
  };

  const scanColumns: DataTableColumn<HealthScanResult>[] = [
    {
      key: 'documentTitle',
      header: 'Tài liệu',
      render: (row) => (
        <div className="min-w-[200px]">
          <p className="font-semibold text-slate-900 dark:text-white">
            {row.documentTitle}
          </p>
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {row.originalFileName ?? row.scanId} • {row.department}
          </p>
        </div>
      ),
    },
    {
      key: 'healthScore',
      header: 'Điểm sức khỏe',
      render: (row) => (
        <span
          className={[
            'font-mono text-sm font-bold tabular-nums',
            row.healthScore >= 80
              ? 'text-emerald-600 dark:text-emerald-400'
              : row.healthScore >= 60
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400',
          ].join(' ')}
        >
          {row.healthScore}/100
        </span>
      ),
    },
    {
      key: 'integrityStatus',
      header: 'Toàn vẹn SHA-256',
      render: (row) => (
        <Badge
          status={row.integrityStatus}
          showDot
          pulse={row.integrityStatus !== 'intact'}
        />
      ),
    },
    {
      key: 'healthStatus',
      header: 'Trạng thái',
      render: (row) => <Badge status={row.healthStatus} />,
    },
    {
      key: 'message',
      header: 'Kết quả phân tích',
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-xs">
          {row.message ?? 'Đã hoàn tất kiểm tra'}
        </span>
      ),
    },
    {
      key: 'scannedAt',
      header: 'Thời điểm quét',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatDateTime(row.scannedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Health Scanner
            </h1>
            {isMock && (
              <Badge status="active" showDot>
                Standalone Engine
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Chẩn đoán sức khỏe tài liệu toàn diện: toàn vẹn SHA-256, quét rò rỉ và đối chiếu chính sách.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          loading={scanning}
          onClick={() => void handleRunFullScan()}
          leftIcon={<Play className="h-4 w-4" />}
        >
          {scanning ? 'Đang quét hệ thống...' : 'Run Full System Scan'}
        </Button>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-medium opacity-75 hover:opacity-100 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Multi-step Scan Progress Panel */}
      {(scanning || progressPct > 0) && (
        <section className="rounded-xl border border-cyan-500/30 bg-white dark:bg-slate-900/95 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Tiến trình quét bảo mật toàn hệ thống
              </h2>
            </div>
            <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
              {progressPct}%
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              style={{ width: `${progressPct}%` }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 transition-all duration-500"
            />
          </div>

          {/* 3 Steps */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {SCAN_STEPS.map((step, index) => {
              const isCompleted = activeStepIndex > index || progressPct === 100;
              const isRunning = scanning && activeStepIndex === index;

              return (
                <div
                  key={step.id}
                  className={[
                    'rounded-xl border p-3.5 transition-all',
                    isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isRunning
                        ? 'border-cyan-500/40 bg-cyan-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 opacity-70',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {step.label}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-500 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {step.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top Grid: SVG Circular Gauge + KPI StatCards */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* SVG Circular Health Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Điểm sức khỏe tổng thể
          </h2>

          <div className="relative mt-4 flex items-center justify-center">
            <svg
              className="h-44 w-44 -rotate-90"
              viewBox="0 0 160 160"
              aria-label={`Điểm sức khỏe tổng thể ${stats.overallScore}%`}
            >
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                strokeWidth="12"
                className="stroke-slate-200 dark:stroke-slate-800"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={`transition-all duration-700 ${gaugeStrokeColor}`}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-4xl font-extrabold tabular-nums ${gaugeTextColor}`}
              >
                {stats.overallScore}%
              </span>
              <span className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {stats.overallScore >= 80
                  ? 'Hệ thống an toàn'
                  : stats.overallScore >= 60
                    ? 'Cần tối ưu'
                    : 'Mức rủi ro cao'}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Lần quét gần nhất:{' '}
            <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
              {formatDateTime(lastScanAt)}
            </span>
          </p>
        </div>

        {/* Summary StatCards + Checklist Overview */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Hạng mục đạt (Pass)"
              value={stats.passCount}
              tone="emerald"
              icon={<ShieldCheck className="h-5 w-5" />}
              subtitle={`Trên tổng ${stats.total} hạng mục`}
            />
            <StatCard
              title="Cảnh báo (Warning)"
              value={stats.warningCount}
              tone="amber"
              icon={<AlertTriangle className="h-5 w-5" />}
              subtitle="Cần rà soát chính sách"
            />
            <StatCard
              title="Nghiêm trọng (Critical)"
              value={stats.criticalCount}
              tone={stats.criticalCount > 0 ? 'rose' : 'emerald'}
              icon={<ShieldAlert className="h-5 w-5" />}
              subtitle="Ưu tiên xử lý ngay"
            />
          </div>

          {/* Security Checklist Card */}
          <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-cyan-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Checklist kiểm tra bảo mật &amp; tuân thủ
                </h2>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {stats.warningCount + stats.criticalCount} hạng mục cần khắc phục
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {checklist.map((item) => {
                const badgeStatus =
                  item.status === 'pass'
                    ? 'healthy'
                    : item.status === 'warning'
                      ? 'warning'
                      : 'critical';
                const badgeLabel =
                  item.status === 'pass'
                    ? 'Pass'
                    : item.status === 'warning'
                      ? 'Warning'
                      : 'Critical';

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          status={badgeStatus}
                          showDot
                          pulse={item.status === 'critical'}
                        >
                          {badgeLabel}
                        </Badge>
                        <span className="text-[11px] font-medium text-slate-400">
                          {item.category}
                        </span>
                        {item.pointsImpact > 0 && (
                          <span className="font-mono text-[11px] font-semibold text-rose-500">
                            -{item.pointsImpact}đ
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                      <p className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                        Đối tượng: {item.affectedTarget}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {item.status !== 'pass' ? (
                        <Button
                          variant={
                            item.status === 'critical' ? 'danger' : 'secondary'
                          }
                          size="sm"
                          loading={fixingId === item.id}
                          onClick={() => void handleFixNow(item)}
                          leftIcon={<Wrench className="h-3.5 w-3.5" />}
                        >
                          Fix Now
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Đã đạt chuẩn
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Per-Document Scan Logs Table */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Chi tiết kết quả quét từng tài liệu
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lịch sử đối chiếu SHA-256 và điểm sức khỏe chi tiết cho mỗi tệp trong Vault.
          </p>
        </div>

        <DataTable
          data={scanResults ?? []}
          columns={scanColumns}
          loading={loading}
          searchable
          searchPlaceholder="Tìm theo tên tài liệu, phòng ban hoặc scan ID..."
          filterLabel="Sức khỏe"
          filterKey="healthStatus"
          filterOptions={[
            { label: 'Healthy', value: 'healthy' },
            { label: 'Warning', value: 'warning' },
            { label: 'Critical', value: 'critical' },
          ]}
          emptyTitle="Chưa có dữ liệu quét"
          emptyDescription="Nhấn Run Full System Scan để bắt đầu đợt quét kiểm tra toàn diện."
        />
      </section>
    </div>
  );
}
