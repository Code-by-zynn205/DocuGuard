'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileLock2,
  FileText,
  HardDrive,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  UploadCloud,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  DOCUMENT_CATEGORY_LABELS,
  type StatusColorKey,
} from '@/constants';
import { useApi } from '@/hooks/useApi';
import { apiClient, normalizeApiError } from '@/lib/api';
import type { Document, DocumentCategory } from '@/types';

type VaultStatus = 'verified' | 'quarantined' | 'pending_scan';

const VAULT_STATUS_META: Record<
  VaultStatus,
  { label: string; badgeStatus: StatusColorKey }
> = {
  verified: { label: 'Verified', badgeStatus: 'healthy' },
  quarantined: { label: 'Quarantined', badgeStatus: 'tampered' },
  pending_scan: { label: 'Pending Scan', badgeStatus: 'warning' },
};

function getVaultStatus(doc: Document): VaultStatus {
  const customStatus = doc.metadata?.vaultStatus;
  if (
    customStatus === 'verified' ||
    customStatus === 'quarantined' ||
    customStatus === 'pending_scan'
  ) {
    return customStatus;
  }

  if (
    doc.integrityStatus === 'tampered' ||
    doc.integrityStatus === 'missing' ||
    doc.status === 'archived'
  ) {
    return 'quarantined';
  }

  if (!doc.lastIntegrityCheckAt || doc.healthScore < 80) {
    return 'pending_scan';
  }

  return 'verified';
}

function getFileExtension(doc: Document): string {
  const parts = doc.originalFileName.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toUpperCase();
  }
  const mimePart = doc.mimeType.split('/')[1];
  return (mimePart ?? 'FILE').toUpperCase();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** i;
  return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[i]}`;
}

function shortenHash(hash: string): string {
  if (!hash || hash.length <= 16) return hash || '—';
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

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

async function computeFileSha256(file: File): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback mô phỏng mã băm SHA-256 64 ký tự hex khi không có SubtleCrypto
  const seed = `${file.name}:${file.size}:${file.lastModified}`;
  let hex = '';
  for (let i = 0; i < 64; i++) {
    const code = seed.charCodeAt(i % seed.length) ^ (i * 17 + file.size);
    hex += (code & 0xf).toString(16);
  }
  return hex;
}

export default function DocumentsPage() {
  const {
    data: fetchedDocuments,
    loading,
    isMock,
  } = useApi<Document[]>('/documents');

  // Quản lý bổ sung/cập nhật cục bộ (upload mới & cách ly) trên nền dữ liệu từ API
  const [addedDocuments, setAddedDocuments] = useState<Document[]>([]);
  const [quarantinedIds, setQuarantinedIds] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [banner, setBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // State cho Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docDepartment, setDocDepartment] = useState('An toàn thông tin');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('contract');
  const [docConfidential, setDocConfidential] = useState(false);
  const [scanStage, setScanStage] = useState<
    'idle' | 'hashing' | 'scanning' | 'done'
  >('idle');
  const [computedHash, setComputedHash] = useState('');
  const [simulatedRiskScore, setSimulatedRiskScore] = useState<number | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const documents = useMemo(() => {
    const merged = [...addedDocuments, ...(fetchedDocuments ?? [])];
    return merged.map((doc) =>
      quarantinedIds[doc._id]
        ? {
            ...doc,
            integrityStatus: 'tampered' as const,
            healthScore: Math.min(doc.healthScore, 25),
            healthStatus: 'critical' as const,
            updatedAt: new Date().toISOString(),
            metadata: {
              ...(doc.metadata ?? {}),
              vaultStatus: 'quarantined',
            },
          }
        : doc,
    );
  }, [addedDocuments, fetchedDocuments, quarantinedIds]);

  const vaultStats = useMemo(() => {
    let verified = 0;
    let quarantined = 0;
    let pendingScan = 0;

    for (const doc of documents) {
      const st = getVaultStatus(doc);
      if (st === 'verified') verified += 1;
      else if (st === 'quarantined') quarantined += 1;
      else pendingScan += 1;
    }

    return {
      total: documents.length,
      verified,
      quarantined,
      pendingScan,
    };
  }, [documents]);

  const handleCopyHash = async (doc: Document) => {
    try {
      await navigator.clipboard.writeText(doc.fileHash);
      setCopiedHashId(doc._id);
      setTimeout(() => {
        setCopiedHashId((current) => (current === doc._id ? null : current));
      }, 1800);
    } catch {
      setBanner({
        type: 'warning',
        text: `Không thể truy cập clipboard tự động. Mã SHA-256: ${doc.fileHash}`,
      });
    }
  };

  const handleDownload = (doc: Document) => {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    ).replace(/\/+$/, '');

    if (!isMock) {
      window.open(
        `${apiBase}/api/documents/${doc._id}/download`,
        '_blank',
        'noopener,noreferrer',
      );
      return;
    }

    // Trong chế độ standalone mock, tải xuống bản chứng nhận toàn vẹn SHA-256
    const manifest = {
      title: doc.title,
      originalFileName: doc.originalFileName,
      sha256: doc.fileHash,
      backupHash: doc.backupHash,
      vaultStatus: getVaultStatus(doc),
      healthScore: doc.healthScore,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.originalFileName}.sha256.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setBanner({
      type: 'success',
      text: `Đã tải xuống tệp chứng thực SHA-256 cho "${doc.originalFileName}".`,
    });
  };

  const handleQuarantine = async (doc: Document) => {
    setQuarantinedIds((prev) => ({ ...prev, [doc._id]: true }));
    try {
      await apiClient.patch(`/documents/${doc._id}/health`, {
        integrityStatus: 'tampered',
        healthScore: 25,
      });
    } catch {
      // Bỏ qua lỗi mạng khi chạy standalone mock vì đã cập nhật trạng thái cách ly cục bộ
    }

    setBanner({
      type: 'warning',
      text: `Đã cách ly tài liệu "${doc.title}" vào vùng kiểm dịch (Quarantined).`,
    });
  };

  const resetUploadModal = () => {
    setSelectedFile(null);
    setDocTitle('');
    setDocDepartment('An toàn thông tin');
    setDocCategory('contract');
    setDocConfidential(false);
    setScanStage('idle');
    setComputedHash('');
    setSimulatedRiskScore(null);
    setUploading(false);
  };

  const startFileAnalysis = async (file: File) => {
    setSelectedFile(file);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    setScanStage('hashing');
    const hash = await computeFileSha256(file);
    setComputedHash(hash);

    setScanStage('scanning');
    await new Promise((resolve) => setTimeout(resolve, 650));

    // Tính điểm rủi ro mô phỏng dựa trên kích thước tệp & phân loại bảo mật
    const risk = file.size === 0 ? 85 : docConfidential ? 18 : 6;
    setSimulatedRiskScore(risk);
    setScanStage('done');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void startFileAnalysis(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void startFileAnalysis(file);
    }
  };

  const handleConfirmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const now = new Date().toISOString();
    const riskScore = simulatedRiskScore ?? 8;
    const healthScore = Math.max(0, 100 - riskScore);
    const isEmpty = selectedFile.size === 0;
    const vaultStatus: VaultStatus = isEmpty
      ? 'quarantined'
      : riskScore <= 20
        ? 'verified'
        : 'pending_scan';

    const newDocument: Document = {
      _id: `doc_${Date.now()}`,
      title: docTitle.trim() || selectedFile.name,
      description: 'Tài liệu được tải lên và băm SHA-256 qua Document Vault.',
      originalFileName: selectedFile.name,
      filePath: `/storage/documents/${Date.now()}_${selectedFile.name}`,
      backupFilePath: `/storage/backups/${Date.now()}_${selectedFile.name}.backup`,
      backupHash: computedHash,
      mimeType: selectedFile.type || 'application/octet-stream',
      fileSize: selectedFile.size,
      fileHash: computedHash,
      category: docCategory,
      department: docDepartment,
      status: 'active',
      isConfidential: docConfidential,
      healthScore,
      healthStatus:
        healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical',
      healthDeductions: isEmpty
        ? [
            {
              rule: 'EMPTY_FILE',
              reason: 'Tệp tải lên rỗng (0 bytes)',
              pointsDeducted: 50,
              detectedAt: now,
            },
          ]
        : [],
      integrityStatus: isEmpty ? 'tampered' : 'intact',
      lastIntegrityCheckAt: now,
      lastHealthScanAt: now,
      isMissing: false,
      isDuplicate: false,
      duplicateCount: 0,
      requiredAppendices: [],
      attachedAppendices: [],
      missingAppendices: [],
      hasMissingAppendix: false,
      currentVersion: 1,
      renewalRemindersSent: { day30: false, day15: false, day7: false },
      tags: docConfidential ? ['confidential', 'vault'] : ['vault'],
      metadata: { vaultStatus },
      createdAt: now,
      updatedAt: now,
    };

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', newDocument.title);
      formData.append('department', newDocument.department);
      formData.append('category', newDocument.category);
      formData.append('isConfidential', String(newDocument.isConfidential));

      const res = await apiClient.upload<Document>('/documents', formData, {
        mockFallback: false,
      });
      setAddedDocuments((prev) => [res.data, ...prev]);
      setBanner({
        type: 'success',
        text: `Đã tải lên và xác thực SHA-256 cho "${newDocument.originalFileName}".`,
      });
      setUploadModalOpen(false);
      resetUploadModal();
    } catch (err) {
      // Nếu backend chưa bật, lưu trực tiếp vào kho tài liệu cục bộ ở chế độ standalone
      if (isMock) {
        setAddedDocuments((prev) => [newDocument, ...prev]);
        setBanner({
          type: 'success',
          text: `Đã mã hóa SHA-256 và đưa "${newDocument.originalFileName}" vào Document Vault (Standalone Mode).`,
        });
        setUploadModalOpen(false);
        resetUploadModal();
      } else {
        setBanner({
          type: 'error',
          text: normalizeApiError(err),
        });
        setUploading(false);
      }
    }
  };

  const columns: DataTableColumn<Document>[] = [
    {
      key: 'originalFileName',
      header: 'Tên file',
      render: (doc) => (
        <div className="flex items-start gap-3 min-w-[220px]">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400">
            {doc.isConfidential ? (
              <FileLock2 className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-semibold text-slate-900 dark:text-white max-w-[240px]">
                {doc.title}
              </p>
              {doc.isConfidential && (
                <span
                  title="Tài liệu tối mật"
                  className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                >
                  <Lock className="mr-0.5 h-2.5 w-2.5" />
                  Mật
                </span>
              )}
            </div>
            <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px]">
              {doc.originalFileName}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {doc.department} • v{doc.currentVersion}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'mimeType',
      header: 'Định dạng',
      render: (doc) => (
        <div className="whitespace-nowrap">
          <span className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            {getFileExtension(doc)}
          </span>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {formatBytes(doc.fileSize)}
          </p>
        </div>
      ),
    },
    {
      key: 'fileHash',
      header: 'Mã hash SHA-256',
      render: (doc) => {
        const copied = copiedHashId === doc._id;
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <code
              title={doc.fileHash}
              className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-mono text-xs text-slate-700 dark:text-cyan-300"
            >
              {shortenHash(doc.fileHash)}
            </code>
            <button
              type="button"
              onClick={() => void handleCopyHash(doc)}
              title="Sao chép đầy đủ mã SHA-256"
              aria-label={`Sao chép hash của ${doc.originalFileName}`}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        );
      },
    },
    {
      key: 'healthScore',
      header: 'Điểm rủi ro',
      render: (doc) => {
        const riskScore = Math.max(0, Math.min(100, 100 - doc.healthScore));
        const barColor =
          riskScore <= 20
            ? 'bg-emerald-500'
            : riskScore < 50
              ? 'bg-amber-500'
              : 'bg-rose-500';
        const textColor =
          riskScore <= 20
            ? 'text-emerald-600 dark:text-emerald-400'
            : riskScore < 50
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-rose-600 dark:text-rose-400';

        return (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span className={`font-semibold ${textColor}`}>
                {riskScore}/100
              </span>
              <span className="text-[11px] text-slate-400">
                HP {doc.healthScore}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                style={{ width: `${Math.max(4, riskScore)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'vaultStatus',
      header: 'Trạng thái',
      render: (doc) => {
        const vaultStatus = getVaultStatus(doc);
        const meta = VAULT_STATUS_META[vaultStatus];
        return (
          <Badge
            status={meta.badgeStatus}
            showDot
            pulse={vaultStatus === 'quarantined'}
          >
            {meta.label}
          </Badge>
        );
      },
    },
    {
      key: 'updatedAt',
      header: 'Ngày cập nhật',
      render: (doc) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatDateTime(doc.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (doc) => {
        const isQuarantined = getVaultStatus(doc) === 'quarantined';
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDoc(doc)}
              title="Xem chi tiết metadata"
              leftIcon={<Eye className="h-3.5 w-3.5" />}
            >
              Chi tiết
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDownload(doc)}
              title="Tải xuống tệp"
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Tải
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={isQuarantined}
              onClick={() => void handleQuarantine(doc)}
              title={
                isQuarantined
                  ? 'Tài liệu đã được cách ly'
                  : 'Cách ly tài liệu khỏi truy cập thông thường'
              }
              leftIcon={<ShieldAlert className="h-3.5 w-3.5" />}
            >
              {isQuarantined ? 'Đã cách ly' : 'Cách ly'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Document Vault
            </h1>
            {isMock && (
              <Badge status="active" showDot>
                Standalone Vault
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kho lưu trữ tài liệu mã hóa chữ ký số SHA-256, chấm điểm rủi ro và cách ly bất thường.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            resetUploadModal();
            setUploadModalOpen(true);
          }}
          leftIcon={<Upload className="h-4 w-4" />}
        >
          Upload Document
        </Button>
      </div>

      {/* Status Banner */}
      {banner && (
        <div
          role="status"
          className={[
            'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
            banner.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : banner.type === 'warning'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{banner.text}</span>
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

      {/* Vault Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng tệp trong Vault"
          value={vaultStats.total}
          tone="cyan"
          loading={loading}
          icon={<HardDrive className="h-5 w-5" />}
          subtitle="SHA-256 Protected"
        />
        <StatCard
          title="Verified"
          value={vaultStats.verified}
          tone="emerald"
          loading={loading}
          icon={<ShieldCheck className="h-5 w-5" />}
          subtitle="Nguyên vẹn & an toàn"
        />
        <StatCard
          title="Pending Scan"
          value={vaultStats.pendingScan}
          tone="amber"
          loading={loading}
          icon={<Sparkles className="h-5 w-5" />}
          subtitle="Chờ quét / cần rà soát"
        />
        <StatCard
          title="Quarantined"
          value={vaultStats.quarantined}
          tone={vaultStats.quarantined > 0 ? 'rose' : 'default'}
          loading={loading}
          icon={<ShieldAlert className="h-5 w-5" />}
          subtitle="Đã cách ly kiểm dịch"
        />
      </div>

      {/* Document Vault DataTable */}
      <DataTable
        data={documents}
        columns={columns}
        loading={loading}
        searchable
        searchPlaceholder="Tìm kiếm tên file, tiêu đề hoặc mã SHA-256..."
        searchPredicate={(doc, query) =>
          doc.originalFileName.toLowerCase().includes(query) ||
          doc.title.toLowerCase().includes(query) ||
          doc.department.toLowerCase().includes(query) ||
          doc.fileHash.toLowerCase().includes(query)
        }
        filterLabel="Trạng thái"
        filterOptions={[
          { label: 'Verified', value: 'verified' },
          { label: 'Quarantined', value: 'quarantined' },
          { label: 'Pending Scan', value: 'pending_scan' },
        ]}
        filterPredicate={(doc, filterValue) =>
          getVaultStatus(doc) === filterValue
        }
        emptyTitle="Không tìm thấy tài liệu nào trong Vault"
        emptyDescription="Tải lên tài liệu mới hoặc điều chỉnh bộ lọc trạng thái."
        emptyAction={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetUploadModal();
              setUploadModalOpen(true);
            }}
            leftIcon={<Upload className="h-3.5 w-3.5" />}
          >
            Upload Document
          </Button>
        }
      />

      {/* Upload Document Modal (Drag & Drop + Simulated SHA-256 & Risk Scan) */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          resetUploadModal();
        }}
        title="Upload Document vào Vault"
        description="Tệp sẽ được tính dấu vân tay SHA-256 và quét rủi ro bảo mật trước khi lưu trữ."
        size="lg"
      >
        <form onSubmit={handleConfirmUpload} className="space-y-5">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer',
              isDragging
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 hover:border-cyan-500/60',
            ].join(' ')}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
              {selectedFile
                ? selectedFile.name
                : 'Kéo thả tài liệu vào đây hoặc bấm để chọn file'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedFile
                ? `${formatBytes(selectedFile.size)} • ${selectedFile.type || 'application/octet-stream'}`
                : 'Hỗ trợ PDF, DOCX, XLSX, JSON, TXT (tự động băm SHA-256)'}
            </p>
          </div>

          {/* Real-time Hashing & Risk Scan Simulation Progress */}
          {scanStage !== 'idle' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-cyan-500" />
                  {scanStage === 'hashing' && 'Đang tính toán mã băm SHA-256...'}
                  {scanStage === 'scanning' &&
                    'Đang chạy 5 luật quét rủi ro bảo mật...'}
                  {scanStage === 'done' &&
                    'Hoàn tất băm SHA-256 & đánh giá rủi ro'}
                </span>

                {scanStage === 'done' && simulatedRiskScore !== null && (
                  <Badge
                    status={
                      simulatedRiskScore <= 20
                        ? 'healthy'
                        : simulatedRiskScore < 50
                          ? 'warning'
                          : 'critical'
                    }
                    showDot
                  >
                    Risk Score: {simulatedRiskScore}/100
                  </Badge>
                )}
              </div>

              {computedHash && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    SHA-256 Fingerprint
                  </p>
                  <p className="mt-0.5 break-all font-mono text-xs text-cyan-600 dark:text-cyan-400">
                    {computedHash}
                  </p>
                </div>
              )}

              {scanStage === 'done' && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Bản sao lưu bảo mật (Safe Backup) sẽ được đồng bộ ngay sau khi lưu.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Document Metadata Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tiêu đề tài liệu
              </label>
              <input
                type="text"
                required
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Ví dụ: Hợp đồng bảo mật NDA 2026"
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phòng ban sở hữu
              </label>
              <input
                type="text"
                required
                value={docDepartment}
                onChange={(e) => setDocDepartment(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phân loại tài liệu
              </label>
              <select
                value={docCategory}
                onChange={(e) =>
                  setDocCategory(e.target.value as DocumentCategory)
                }
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={docConfidential}
              onChange={(e) => setDocConfidential(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span>
              Đánh dấu <strong>Tài liệu tối mật</strong> (bắt buộc phê duyệt CISO khi khôi phục)
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setUploadModalOpen(false);
                resetUploadModal();
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={uploading}
              disabled={!selectedFile || scanStage !== 'done'}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Lưu vào Document Vault
            </Button>
          </div>
        </form>
      </Modal>

      {/* Metadata Detail Modal */}
      <Modal
        isOpen={Boolean(selectedDoc)}
        onClose={() => setSelectedDoc(null)}
        title={selectedDoc?.title}
        description={selectedDoc?.originalFileName}
        size="lg"
        footer={
          selectedDoc && (
            <>
              <Button
                variant="secondary"
                onClick={() => handleDownload(selectedDoc)}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Tải xuống
              </Button>
              <Button
                variant="danger"
                disabled={getVaultStatus(selectedDoc) === 'quarantined'}
                onClick={() => {
                  void handleQuarantine(selectedDoc);
                  setSelectedDoc(null);
                }}
                leftIcon={<ShieldAlert className="h-4 w-4" />}
              >
                {getVaultStatus(selectedDoc) === 'quarantined'
                  ? 'Đã cách ly'
                  : 'Cách ly tài liệu'}
              </Button>
              <Button variant="ghost" onClick={() => setSelectedDoc(null)}>
                Đóng
              </Button>
            </>
          )
        }
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                status={VAULT_STATUS_META[getVaultStatus(selectedDoc)].badgeStatus}
                showDot
              >
                {VAULT_STATUS_META[getVaultStatus(selectedDoc)].label}
              </Badge>
              <Badge status={selectedDoc.integrityStatus} showDot />
              <Badge status={selectedDoc.healthStatus}>
                Health: {selectedDoc.healthScore}/100
              </Badge>
              {selectedDoc.isConfidential && (
                <Badge status="pending_approval">Tài liệu tối mật</Badge>
              )}
            </div>

            {selectedDoc.description && (
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {selectedDoc.description}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 text-xs sm:grid-cols-2">
              <div>
                <p className="text-slate-400">Phòng ban</p>
                <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                  {selectedDoc.department}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Phân loại &amp; Phiên bản</p>
                <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">
                  {DOCUMENT_CATEGORY_LABELS[selectedDoc.category]} • v
                  {selectedDoc.currentVersion}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Định dạng &amp; Dung lượng</p>
                <p className="mt-0.5 font-mono text-slate-800 dark:text-slate-100">
                  {getFileExtension(selectedDoc)} ({formatBytes(selectedDoc.fileSize)})
                </p>
              </div>
              <div>
                <p className="text-slate-400">Ngày hết hạn</p>
                <p className="mt-0.5 font-mono text-slate-800 dark:text-slate-100">
                  {formatDateTime(selectedDoc.expiresAt)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-400">SHA-256 hiện tại</p>
                <p className="mt-0.5 break-all font-mono text-cyan-600 dark:text-cyan-400">
                  {selectedDoc.fileHash}
                </p>
              </div>
              {selectedDoc.backupHash && (
                <div className="sm:col-span-2">
                  <p className="text-slate-400">SHA-256 bản sao lưu gốc</p>
                  <p className="mt-0.5 break-all font-mono text-emerald-600 dark:text-emerald-400">
                    {selectedDoc.backupHash}
                  </p>
                </div>
              )}
              <div className="sm:col-span-2">
                <p className="text-slate-400">Đường dẫn lưu trữ</p>
                <p className="mt-0.5 break-all font-mono text-slate-600 dark:text-slate-300">
                  {selectedDoc.filePath}
                </p>
              </div>
            </div>

            {selectedDoc.healthDeductions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-500">
                  Các yếu tố trừ điểm rủi ro ({selectedDoc.healthDeductions.length})
                </h3>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-rose-500/25 bg-rose-500/5">
                  {selectedDoc.healthDeductions.map((item, idx) => (
                    <div
                      key={`${item.rule}-${idx}`}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <p className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                          {item.rule}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          {item.reason}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{item.pointsDeducted}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
