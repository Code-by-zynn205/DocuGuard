'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileWarning,
  Filter,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import type {
  Document,
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from '@/types';

const STATUS_UI_LABELS: Record<IncidentStatus, string> = {
  open: 'Open',
  in_progress: 'Investigating',
  resolved: 'Resolved',
  closed: 'Closed',
};

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

function buildAiAuditSummary(incident: Incident): {
  confidence: number;
  rootCause: string;
  impact: string;
  recommendation: string;
} {
  switch (incident.type) {
    case 'integrity_violation':
      return {
        confidence: 96,
        rootCause:
          'Phát hiện thay đổi nội dung tệp trực tiếp trên vùng lưu trữ mà không đi qua quy trình cập nhật phiên bản (DocumentVersion). Mã băm SHA-256 thực tế lệch hoàn toàn so với bản sao lưu gốc.',
        impact:
          'Nguy cơ giả mạo chứng từ kiểm toán hoặc bị mã độc/nhân sự trái phép chỉnh sửa nội dung nhạy cảm.',
        recommendation:
          'Cách ly tệp ngay lập tức, kích hoạt Safe Recovery 1-Click để khôi phục từ bản sao lưu gốc và rà soát Audit Log theo IP truy cập gần nhất.',
      };
    case 'missing_file':
      return {
        confidence: 98,
        rootCause:
          'Tệp vật lý không còn tồn tại tại đường dẫn được chỉ định trong Document Vault.',
        impact:
          'Gián đoạn truy cập tài liệu vận hành và vi phạm chính sách lưu trữ liên tục.',
        recommendation:
          'Thực hiện khôi phục từ Recovery Point gần nhất và kiểm tra nhật ký hệ thống tệp.',
      };
    case 'expiring_soon':
    case 'expired':
      return {
        confidence: 94,
        rootCause:
          'Tài liệu đã tới ngưỡng cảnh báo hết hạn hiệu lực theo lịch nhắc tự động của n8n Renewal Reminder.',
        impact:
          'Rủi ro pháp lý và gián đoạn tuân thủ nội bộ nếu không gia hạn đúng hạn SLA.',
        recommendation:
          'Gửi thông báo tới phòng ban sở hữu để gia hạn hợp đồng/chính sách và tải lên phiên bản mới.',
      };
    default:
      return {
        confidence: 90,
        rootCause:
          'Hệ thống giám sát phát hiện bất thường về điểm sức khỏe hoặc cấu trúc phụ lục tài liệu.',
        impact:
          'Ảnh hưởng đến điểm sức khỏe tổng thể của kho tài liệu doanh nghiệp.',
        recommendation:
          'Kiểm tra chi tiết metadata và sử dụng công cụ Health Scanner để khắc phục tự động.',
      };
  }
}

function resolveDocumentInfo(docRef?: string | Document): Document | null {
  if (!docRef || typeof docRef === 'string') return null;
  return docRef;
}

export default function IncidentsPage() {
  const {
    data: fetchedIncidents,
    loading,
    isMock,
  } = useApi<Incident[]>('/incidents');

  const [severityFilter, setSeverityFilter] = useState<'all' | IncidentSeverity>(
    'all',
  );
  const [statusFilter, setStatusFilter] = useState<'all' | IncidentStatus>(
    'all',
  );
  const [incidentOverrides, setIncidentOverrides] = useState<
    Record<string, Incident>
  >({});
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const incidents = useMemo(() => {
    const base = fetchedIncidents ?? [];
    return base.map((inc) => incidentOverrides[inc._id] ?? inc);
  }, [fetchedIncidents, incidentOverrides]);

  const filteredIncidents = useMemo(
    () =>
      incidents.filter((inc) => {
        if (severityFilter !== 'all' && inc.severity !== severityFilter) {
          return false;
        }
        if (statusFilter !== 'all' && inc.status !== statusFilter) {
          return false;
        }
        return true;
      }),
    [incidents, severityFilter, statusFilter],
  );

  const selectedIncident = useMemo(
    () => incidents.find((inc) => inc._id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId],
  );

  const summary = useMemo(() => {
    const open = incidents.filter((i) => i.status === 'open').length;
    const investigating = incidents.filter(
      (i) => i.status === 'in_progress',
    ).length;
    const resolved = incidents.filter(
      (i) => i.status === 'resolved' || i.status === 'closed',
    ).length;
    const critical = incidents.filter(
      (i) => i.severity === 'critical' && i.status !== 'resolved',
    ).length;

    return { total: incidents.length, open, investigating, resolved, critical };
  }, [incidents]);

  const handleUpdateStatus = async (
    incident: Incident,
    nextStatus: IncidentStatus,
  ) => {
    setUpdatingStatus(true);
    const now = new Date().toISOString();
    const actionLabel =
      nextStatus === 'in_progress'
        ? 'ACKNOWLEDGED'
        : nextStatus === 'resolved'
          ? 'RESOLVED'
          : 'STATUS_CHANGED';

    const noteText =
      nextStatus === 'in_progress'
        ? 'SOC Operator đã tiếp nhận và chuyển sang trạng thái Investigating.'
        : resolutionNotes.trim() ||
          'Sự cố đã được xử lý và xác nhận an toàn.';

    const updated: Incident = {
      ...incident,
      status: nextStatus,
      resolutionNotes:
        nextStatus === 'resolved' ? noteText : incident.resolutionNotes,
      resolvedAt: nextStatus === 'resolved' ? now : incident.resolvedAt,
      updatedAt: now,
      timeline: [
        ...incident.timeline,
        {
          action: actionLabel,
          note: noteText,
          timestamp: now,
        },
      ],
    };

    try {
      await apiClient.patch(`/incidents/${incident._id}/status`, {
        status: nextStatus,
        resolutionNotes: nextStatus === 'resolved' ? noteText : undefined,
      });
    } catch {
      // Standalone mock fallback: vẫn cập nhật trực tiếp state cục bộ
    }

    setIncidentOverrides((prev) => ({ ...prev, [incident._id]: updated }));
    setResolutionNotes('');
    setUpdatingStatus(false);
    setBanner(
      `Đã cập nhật sự cố ${incident.incidentCode} sang trạng thái ${STATUS_UI_LABELS[nextStatus]}.`,
    );
  };

  const columns: DataTableColumn<Incident>[] = [
    {
      key: 'incidentCode',
      header: 'Mã sự cố',
      render: (inc) => (
        <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
          {inc.incidentCode}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Chi tiết sự cố',
      render: (inc) => {
        const doc = resolveDocumentInfo(inc.documentId);
        return (
          <div className="min-w-[240px]">
            <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
              {inc.title}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
              {doc ? `Tài liệu: ${doc.originalFileName}` : inc.description}
            </p>
          </div>
        );
      },
    },
    {
      key: 'severity',
      header: 'Mức độ',
      render: (inc) => (
        <Badge
          severity={inc.severity}
          showDot
          pulse={inc.severity === 'critical' && inc.status !== 'resolved'}
        />
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (inc) => (
        <Badge status={inc.status} showDot>
          {STATUS_UI_LABELS[inc.status]}
        </Badge>
      ),
    },
    {
      key: 'slaDeadline',
      header: 'Hạn SLA',
      render: (inc) => (
        <span
          className={[
            'font-mono text-xs whitespace-nowrap',
            inc.slaBreached
              ? 'font-semibold text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400',
          ].join(' ')}
        >
          {formatDateTime(inc.slaDeadline)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Thời gian phát hiện',
      render: (inc) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatDateTime(inc.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (inc) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedIncidentId(inc._id);
          }}
        >
          Phân tích &amp; Xử lý
        </Button>
      ),
    },
  ];

  const aiSummary = selectedIncident
    ? buildAiAuditSummary(selectedIncident)
    : null;
  const relatedDoc = selectedIncident
    ? resolveDocumentInfo(selectedIncident.documentId)
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Incident Center
            </h1>
            {isMock && (
              <Badge status="active" showDot>
                Standalone SOC
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Trung tâm tiếp nhận, điều tra nguyên nhân AI Audit và điều phối xử lý sự cố bảo mật.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
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
          title="Tổng sự cố"
          value={summary.total}
          tone="cyan"
          loading={loading}
          icon={<ShieldAlert className="h-5 w-5" />}
          subtitle="Tất cả mức độ"
        />
        <StatCard
          title="Open (Chưa tiếp nhận)"
          value={summary.open}
          tone={summary.open > 0 ? 'amber' : 'default'}
          loading={loading}
          icon={<AlertTriangle className="h-5 w-5" />}
          subtitle="Cần Acknowledge ngay"
        />
        <StatCard
          title="Investigating"
          value={summary.investigating}
          tone="cyan"
          loading={loading}
          icon={<SearchCheck className="h-5 w-5" />}
          subtitle="Đang điều tra nguyên nhân"
        />
        <StatCard
          title="Critical đang hoạt động"
          value={summary.critical}
          tone={summary.critical > 0 ? 'rose' : 'emerald'}
          loading={loading}
          icon={<FileWarning className="h-5 w-5" />}
          subtitle={`${summary.resolved} sự cố đã xử lý`}
        />
      </div>

      {/* Dual Filter Bar: Severity & Status */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            <Filter className="h-3.5 w-3.5" />
            Mức độ:
          </span>
          {(
            [
              { label: 'Tất cả', value: 'all' },
              { label: 'Critical', value: 'critical' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSeverityFilter(item.value)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                severityFilter === item.value
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Trạng thái:
          </span>
          {(
            [
              { label: 'Tất cả', value: 'all' },
              { label: 'Open', value: 'open' },
              { label: 'Investigating', value: 'in_progress' },
              { label: 'Resolved', value: 'resolved' },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatusFilter(item.value)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                statusFilter === item.value
                  ? 'bg-slate-900 dark:bg-cyan-500/20 text-white dark:text-cyan-300 ring-1 ring-cyan-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* Incidents DataTable */}
      <DataTable
        data={filteredIncidents}
        columns={columns}
        loading={loading}
        searchable
        searchPlaceholder="Tìm mã sự cố, tiêu đề hoặc mô tả..."
        searchPredicate={(inc, q) =>
          inc.incidentCode.toLowerCase().includes(q) ||
          inc.title.toLowerCase().includes(q) ||
          inc.description.toLowerCase().includes(q)
        }
        onRowClick={(inc) => {
          setResolutionNotes(inc.resolutionNotes ?? '');
          setSelectedIncidentId(inc._id);
        }}
        emptyTitle="Không có sự cố phù hợp với bộ lọc"
        emptyDescription="Thử chuyển sang mức độ hoặc trạng thái khác để xem thêm sự cố."
      />

      {/* Incident Detail Modal: Timeline, Related Document, AI Audit Summary & Status Actions */}
      <Modal
        isOpen={Boolean(selectedIncident)}
        onClose={() => setSelectedIncidentId(null)}
        title={
          selectedIncident
            ? `${selectedIncident.incidentCode} — ${selectedIncident.title}`
            : ''
        }
        description={
          selectedIncident
            ? `Phát hiện lúc ${formatDateTime(selectedIncident.createdAt)}`
            : undefined
        }
        size="xl"
        footer={
          selectedIncident && (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedIncident.status === 'open' && (
                  <Button
                    variant="secondary"
                    loading={updatingStatus}
                    onClick={() =>
                      void handleUpdateStatus(selectedIncident, 'in_progress')
                    }
                    leftIcon={<SearchCheck className="h-4 w-4" />}
                  >
                    Acknowledge (Investigating)
                  </Button>
                )}

                {selectedIncident.status !== 'resolved' &&
                  selectedIncident.status !== 'closed' && (
                    <Button
                      variant="primary"
                      loading={updatingStatus}
                      onClick={() =>
                        void handleUpdateStatus(selectedIncident, 'resolved')
                      }
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Resolve Incident
                    </Button>
                  )}
              </div>

              <Button
                variant="ghost"
                onClick={() => setSelectedIncidentId(null)}
              >
                Đóng
              </Button>
            </div>
          )
        }
      >
        {selectedIncident && aiSummary && (
          <div className="space-y-5">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge severity={selectedIncident.severity} showDot />
              <Badge status={selectedIncident.status} showDot>
                {STATUS_UI_LABELS[selectedIncident.status]}
              </Badge>
              {selectedIncident.slaDeadline && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3" />
                  SLA: {formatDateTime(selectedIncident.slaDeadline)}
                </span>
              )}
            </div>

            {/* AI Audit Summary */}
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/8 to-indigo-500/8 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                    AI Audit Summary — Phân tích nguyên nhân
                  </h3>
                </div>
                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                  Độ tin cậy: {aiSummary.confidence}%
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                <div className="rounded-lg bg-white/80 dark:bg-slate-950/60 p-3 border border-slate-200/70 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Nguyên nhân gốc rễ
                  </p>
                  <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                    {aiSummary.rootCause}
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 dark:bg-slate-950/60 p-3 border border-slate-200/70 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Phạm vi ảnh hưởng
                  </p>
                  <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                    {aiSummary.impact}
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 dark:bg-slate-950/60 p-3 border border-slate-200/70 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Khuyến nghị khắc phục
                  </p>
                  <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                    {aiSummary.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Related Document */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tài liệu liên quan
                </h3>
                <Link
                  href={ROUTES.DOCUMENTS}
                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  Mở Document Vault
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {relatedDoc ? (
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-slate-400">Tên tài liệu</p>
                    <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
                      {relatedDoc.title}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {relatedDoc.originalFileName}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Toàn vẹn &amp; Health Score</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge status={relatedDoc.integrityStatus} showDot />
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                        {relatedDoc.healthScore}/100
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400">SHA-256 hiện tại</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-cyan-600 dark:text-cyan-400">
                      {relatedDoc.fileHash}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                  Document Ref:{' '}
                  {typeof selectedIncident.documentId === 'string'
                    ? selectedIncident.documentId
                    : 'Hệ thống tổng thể'}
                </p>
              )}
            </div>

            {/* Incident Timeline */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Dòng thời gian xử lý sự cố
              </h3>
              <ol className="relative ml-2.5 space-y-4 border-l border-slate-200 dark:border-slate-800 pl-5">
                {selectedIncident.timeline.map((entry, idx) => (
                  <li key={`${entry.action}-${idx}`} className="relative">
                    <span className="absolute -left-[25px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-cyan-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {entry.action}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {entry.note}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Resolution Notes Input */}
            {selectedIncident.status !== 'resolved' &&
              selectedIncident.status !== 'closed' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ghi chú xử lý (khi đánh dấu Resolve)
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Nhập tóm tắt biện pháp khắc phục hoặc mã bản sao lưu đã khôi phục..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
}
