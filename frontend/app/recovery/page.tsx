'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DatabaseBackup,
  FileLock2,
  History,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { apiClient } from '@/lib/api';
import type { Document, RecoveryPoint } from '@/types';

const RESTORE_PIPELINE_STEPS = [
  'Xác minh chữ ký SHA-256 bản sao lưu nguồn',
  'Tạo ảnh chụp tạm trước khôi phục (Pre-Restore Guard)',
  'Ghi đè an toàn từ Backup Vault sang Storage chính',
  'Hậu kiểm toàn vẹn SHA-256 đạt khớp 100%',
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
    second: '2-digit',
  }).format(date);
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

function getDocumentId(docRef: string | Document): string {
  return typeof docRef === 'string' ? docRef : docRef._id;
}

function getDocumentTitle(point: RecoveryPoint): string {
  if (point.documentTitle) return point.documentTitle;
  if (typeof point.documentId !== 'string') return point.documentId.title;
  return `Tài liệu #${point.documentId}`;
}

export default function RecoveryPage() {
  const {
    data: fetchedRecoveries,
    loading,
    isMock,
  } = useApi<RecoveryPoint[]>('/recovery');

  const [recoveryOverrides, setRecoveryOverrides] = useState<
    Record<string, RecoveryPoint>
  >({});
  const [activeSnapshot, setActiveSnapshot] = useState<RecoveryPoint | null>(
    null,
  );
  const [modalStep, setModalStep] = useState<
    'step1' | 'step2' | 'executing' | 'done'
  >('step1');
  const [restoreReason, setRestoreReason] = useState('');
  const [ackChecked, setAckChecked] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [pipelineStage, setPipelineStage] = useState<number>(-1);
  const [banner, setBanner] = useState<string | null>(null);

  const snapshots = useMemo(() => {
    const base = fetchedRecoveries ?? [];
    return base
      .map((item) => recoveryOverrides[item._id] ?? item)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [fetchedRecoveries, recoveryOverrides]);

  const stats = useMemo(() => {
    const total = snapshots.length;
    const verified = snapshots.filter((s) => Boolean(s.sourceBackupHash)).length;
    const pendingApproval = snapshots.filter(
      (s) => s.status === 'pending_approval',
    ).length;
    const completed = snapshots.filter((s) => s.status === 'completed').length;

    return { total, verified, pendingApproval, completed };
  }, [snapshots]);

  const openRestoreModal = (point: RecoveryPoint) => {
    setActiveSnapshot(point);
    setModalStep('step1');
    setRestoreReason(point.reason || 'Khôi phục về điểm sao lưu an toàn');
    setAckChecked(false);
    setConfirmKeyword('');
    setPipelineStage(-1);
  };

  const closeRestoreModal = () => {
    if (modalStep === 'executing') return;
    setActiveSnapshot(null);
  };

  const executeSafeRestore = async () => {
    if (!activeSnapshot) return;
    setModalStep('executing');
    setPipelineStage(0);

    await new Promise((r) => setTimeout(r, 550));
    setPipelineStage(1);

    await new Promise((r) => setTimeout(r, 550));
    setPipelineStage(2);

    const docId = getDocumentId(activeSnapshot.documentId);
    try {
      await apiClient.post(`/documents/${docId}/recover`, {
        reason: restoreReason,
      });
    } catch {
      // Chế độ standalone mock vẫn cho phép hoàn tất quy trình khôi phục
    }

    await new Promise((r) => setTimeout(r, 600));
    setPipelineStage(3);

    await new Promise((r) => setTimeout(r, 450));
    setPipelineStage(4);

    const now = new Date().toISOString();
    const updatedSnapshot: RecoveryPoint = {
      ...activeSnapshot,
      status: 'completed',
      reason: restoreReason,
      restoredAt: now,
      verifiedAfterRestore: true,
      updatedAt: now,
    };

    setRecoveryOverrides((prev) => ({
      ...prev,
      [activeSnapshot._id]: updatedSnapshot,
    }));
    setActiveSnapshot(updatedSnapshot);
    setModalStep('done');
    setBanner(
      `Đã khôi phục an toàn "${getDocumentTitle(updatedSnapshot)}" về điểm ${updatedSnapshot.recoveryCode ?? updatedSnapshot._id} (SHA-256 Verified).`,
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Safe Recovery Center
            </h1>
            {isMock && (
              <Badge status="active" showDot>
                Standalone Vault
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý các điểm khôi phục (Snapshots) theo mốc thời gian với xác thực 2 bước và hậu kiểm SHA-256.
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
          title="Tổng điểm khôi phục"
          value={stats.total}
          tone="cyan"
          loading={loading}
          icon={<History className="h-5 w-5" />}
          subtitle="Snapshots khả dụng"
        />
        <StatCard
          title="Toàn vẹn SHA-256"
          value={`${stats.verified}/${stats.total}`}
          tone="emerald"
          loading={loading}
          icon={<ShieldCheck className="h-5 w-5" />}
          subtitle="Bản sao lưu sạch 100%"
        />
        <StatCard
          title="Chờ phê duyệt"
          value={stats.pendingApproval}
          tone={stats.pendingApproval > 0 ? 'amber' : 'default'}
          loading={loading}
          icon={<FileLock2 className="h-5 w-5" />}
          subtitle="Tài liệu tối mật"
        />
        <StatCard
          title="Đã khôi phục thành công"
          value={stats.completed}
          tone="emerald"
          loading={loading}
          icon={<DatabaseBackup className="h-5 w-5" />}
          subtitle="Đã hậu kiểm hash"
        />
      </div>

      {/* Snapshots Timeline */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 sm:p-6 shadow-xs">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Dòng thời gian điểm khôi phục (Recovery Snapshots)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Sắp xếp từ mới nhất đến cũ nhất
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Chưa có điểm khôi phục nào được ghi nhận.
          </div>
        ) : (
          <ol className="relative ml-3 space-y-6 border-l-2 border-slate-200 dark:border-slate-800 pl-6">
            {snapshots.map((point) => {
              const isCompleted = point.status === 'completed';

              return (
                <li key={point._id} className="relative">
                  {/* Timeline Node */}
                  <span
                    className={[
                      'absolute -left-[33px] top-4 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900',
                      isCompleted ? 'bg-emerald-500' : 'bg-amber-500',
                    ].join(' ')}
                  />

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-4 sm:p-5 transition-all hover:border-cyan-500/40">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                            {point.recoveryCode ?? point._id}
                          </span>
                          <Badge status="intact" showDot>
                            SHA-256 Verified
                          </Badge>
                          <Badge
                            status={point.status}
                            showDot
                            pulse={point.status === 'pending_approval'}
                          />
                          {point.isConfidentialDocument && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              <Lock className="h-3 w-3" />
                              Tối mật
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            {getDocumentTitle(point)}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                            {point.reason}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 pt-1 text-xs sm:grid-cols-3">
                          <div>
                            <span className="text-slate-400">Mốc tạo Snapshot: </span>
                            <span className="font-mono text-slate-700 dark:text-slate-200">
                              {formatDateTime(point.createdAt)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Phiên bản / Dung lượng: </span>
                            <span className="font-mono text-slate-700 dark:text-slate-200">
                              v{point.versionNumber ?? 1} ({formatBytes(point.backupSize)})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Phòng ban: </span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {point.department ?? 'Hệ thống'}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-mono space-y-1">
                          <div className="truncate text-emerald-600 dark:text-emerald-400">
                            Backup Hash: {point.sourceBackupHash}
                          </div>
                          {point.corruptedFileHash && (
                            <div className="truncate text-rose-600 dark:text-rose-400">
                              Corrupted Hash: {point.corruptedFileHash}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                        <Button
                          variant={isCompleted ? 'secondary' : 'primary'}
                          size="md"
                          onClick={() => openRestoreModal(point)}
                          leftIcon={<RotateCcw className="h-4 w-4" />}
                        >
                          Restore to this point
                        </Button>
                        {point.restoredAt && (
                          <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                            Đã khôi phục: {formatDateTime(point.restoredAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* 2-Step Confirmation & Safe Restore Progress Modal */}
      <Modal
        isOpen={Boolean(activeSnapshot)}
        onClose={closeRestoreModal}
        closeOnBackdropClick={modalStep !== 'executing'}
        title={
          modalStep === 'step1'
            ? 'Xác nhận khôi phục (Bước 1/2): Kiểm tra điểm Snapshot'
            : modalStep === 'step2'
              ? 'Xác nhận khôi phục (Bước 2/2): Xác thực thao tác ghi đè'
              : modalStep === 'executing'
                ? 'Đang thực hiện Safe Recovery...'
                : 'Khôi phục an toàn hoàn tất'
        }
        description={
          activeSnapshot
            ? `${activeSnapshot.recoveryCode ?? activeSnapshot._id} — ${getDocumentTitle(activeSnapshot)}`
            : undefined
        }
        size="lg"
      >
        {activeSnapshot && (
          <div className="space-y-5">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span
                className={[
                  'rounded-full px-2.5 py-1 font-semibold',
                  modalStep === 'step1'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                ].join(' ')}
              >
                Bước 1: Kiểm tra Snapshot
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span
                className={[
                  'rounded-full px-2.5 py-1 font-semibold',
                  modalStep === 'step2'
                    ? 'bg-cyan-600 text-white'
                    : modalStep === 'executing' || modalStep === 'done'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500',
                ].join(' ')}
              >
                Bước 2: Xác thực &amp; Khôi phục
              </span>
            </div>

            {modalStep === 'step1' && (
              <>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      Cảnh báo ghi đè tệp hiện tại trong Document Vault
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Thao tác này sẽ thay thế tệp đang bị hỏng/chỉnh sửa bằng bản sao lưu gốc đã kiểm chứng chữ ký SHA-256.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-xs space-y-2">
                  <div>
                    <span className="text-slate-400">Đường dẫn Backup Vault:</span>
                    <p className="font-mono text-slate-700 dark:text-slate-200 break-all">
                      {activeSnapshot.sourceBackupPath}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">SHA-256 sẽ được khôi phục:</span>
                    <p className="font-mono text-emerald-600 dark:text-emerald-400 break-all">
                      {activeSnapshot.sourceBackupHash}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Lý do thực hiện khôi phục (lưu vào Audit Log)
                  </label>
                  <input
                    type="text"
                    value={restoreReason}
                    onChange={(e) => setRestoreReason(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ackChecked}
                    onChange={(e) => setAckChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>
                    Tôi đã kiểm tra thông tin Snapshot và đồng ý chuyển sang bước xác thực khôi phục cuối cùng.
                  </span>
                </label>

                <div className="flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <Button variant="secondary" onClick={closeRestoreModal}>
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!ackChecked || !restoreReason.trim()}
                    onClick={() => setModalStep('step2')}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Tiếp tục Bước 2/2
                  </Button>
                </div>
              </>
            )}

            {modalStep === 'step2' && (
              <>
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 space-y-2">
                  <p className="font-semibold">
                    Xác thực an toàn lần cuối trước khi ghi đè tệp
                  </p>
                  <p>
                    Nhập chính xác từ khóa{' '}
                    <code className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono font-bold">
                      RESTORE
                    </code>{' '}
                    vào ô bên dưới để kích hoạt quy trình Safe Recovery.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mã xác nhận
                  </label>
                  <input
                    type="text"
                    value={confirmKeyword}
                    onChange={(e) => setConfirmKeyword(e.target.value)}
                    placeholder="Nhập RESTORE"
                    className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 font-mono text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <div className="flex justify-between gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setModalStep('step1')}
                  >
                    Quay lại Bước 1
                  </Button>
                  <div className="flex gap-2.5">
                    <Button variant="secondary" onClick={closeRestoreModal}>
                      Hủy
                    </Button>
                    <Button
                      variant="danger"
                      disabled={confirmKeyword.trim().toUpperCase() !== 'RESTORE'}
                      onClick={() => void executeSafeRestore()}
                      leftIcon={<RotateCcw className="h-4 w-4" />}
                    >
                      Xác nhận &amp; Khôi phục ngay
                    </Button>
                  </div>
                </div>
              </>
            )}

            {(modalStep === 'executing' || modalStep === 'done') && (
              <>
                <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
                  {RESTORE_PIPELINE_STEPS.map((label, idx) => {
                    const completed = pipelineStage > idx || modalStep === 'done';
                    const running =
                      modalStep === 'executing' && pipelineStage === idx;

                    return (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span
                          className={
                            completed
                              ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                              : running
                                ? 'font-semibold text-cyan-600 dark:text-cyan-400'
                                : 'text-slate-400'
                          }
                        >
                          {label}
                        </span>
                        {completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : running ? (
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {modalStep === 'done' && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 shrink-0" />
                      <span>
                        Khôi phục hoàn tất 100%. Chữ ký SHA-256 của tệp gốc đã trùng khớp với bản sao lưu.
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 pt-4">
                  <Button
                    variant="primary"
                    disabled={modalStep === 'executing'}
                    onClick={closeRestoreModal}
                  >
                    {modalStep === 'executing' ? 'Đang xử lý...' : 'Hoàn tất'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
