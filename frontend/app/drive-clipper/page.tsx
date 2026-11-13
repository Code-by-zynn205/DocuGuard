'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  ExternalLink,
  FileCode2,
  FolderSync,
  Globe,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api';
import { getAuthUser } from '@/lib/auth';
import type { Document } from '@/types';

interface GoogleStatus {
  googleConfigured: boolean;
  connected: boolean;
  connectedEmail: string | null;
  connectedName: string | null;
  driveSyncedAt: string | null;
  syncedDocumentsCount: number;
}

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export default function DriveClipperPage() {
  const toast = useToast();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [clips, setClips] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [testingGmail, setTestingGmail] = useState(false);
  const [clipping, setClipping] = useState(false);

  const [selectedText, setSelectedText] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('https://www.facebook.com/');
  const [sourcePlatform, setSourcePlatform] = useState<'google' | 'facebook' | 'web'>('facebook');
  const [notifyGmail, setNotifyGmail] = useState(false);

  const currentUser = getAuthUser();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, clipsRes] = await Promise.all([
        apiClient.get<GoogleStatus>('/google/status', { mockFallback: false }).catch(() => null),
        apiClient.get<Document[]>('/web-clipper/clips', { mockFallback: false }).catch(() => null),
      ]);

      if (statusRes?.data) {
        setStatus(statusRes.data);
        if (statusRes.data.connected) {
          const filesRes = await apiClient
            .get<DriveFileItem[]>('/google/drive/files', { mockFallback: false })
            .catch(() => null);
          if (Array.isArray(filesRes?.data)) {
            setDriveFiles(filesRes.data);
          }
        }
      }

      if (Array.isArray(clipsRes?.data)) {
        setClips(clipsRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleConnectGoogle = () => {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    ).replace(/\/+$/, '');
    window.location.href = `${apiBase}/api/auth/google`;
  };

  const handleSyncDrive = async () => {
    setSyncingDrive(true);
    try {
      const res = await apiClient.post<{
        scannedFiles: number;
        createdCount: number;
        verifiedCount: number;
        tamperedCount: number;
      }>('/google/drive/sync', { email: currentUser?.email }, { mockFallback: false });
      toast.success(
        `Đã quét ${res.data.scannedFiles} file Drive: thêm mới ${res.data.createdCount}, nguyên vẹn ${res.data.verifiedCount}, cảnh báo ${res.data.tamperedCount}.`,
      );
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Chưa có tài khoản Google kết nối Drive.');
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleTestGmail = async () => {
    setTestingGmail(true);
    try {
      const res = await apiClient.post<{ sent: boolean; reason?: string }>(
        '/google/gmail/test',
        { email: status?.connectedEmail || currentUser?.email },
        { mockFallback: false },
      );
      if (res.data.sent) {
        toast.success('Đã gửi email kiểm tra qua Gmail thành công!');
      } else {
        toast.warning(res.data.reason || 'Chưa kết nối Gmail OAuth.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không gửi được Gmail kiểm tra.');
    } finally {
      setTestingGmail(false);
    }
  };

  const handleSubmitClip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedText.trim()) return;
    setClipping(true);
    try {
      const res = await apiClient.post<{
        document: Document;
        classification: { category: string; department: string; classifierMode: string };
        driveSynced: boolean;
      }>(
        '/web-clipper/clip',
        {
          selectedText,
          pageTitle: pageTitle || 'Đoạn trích từ trình duyệt',
          sourceUrl,
          sourcePlatform,
          userEmail: currentUser?.email || status?.connectedEmail || undefined,
          saveToDrive: true,
          notifyGmail,
        },
        { mockFallback: false },
      );
      toast.success(
        `AI (${res.data.classification.classifierMode}) đã phân loại [${res.data.classification.category}] & lưu thành công${res.data.driveSynced ? ' + đồng bộ Drive' : ''}!`,
      );
      setSelectedText('');
      setPageTitle('');
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu đoạn dữ liệu.');
    } finally {
      setClipping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Google Drive Sync &amp; Smart Web Clipper AI
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Đồng bộ Google Drive bằng tài khoản Gmail, cảnh báo SHA-256 qua Gmail và lưu đoạn bôi đen từ Google/Facebook.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            leftIcon={<Mail className="h-4 w-4" />}
            loading={testingGmail}
            onClick={handleTestGmail}
          >
            Test gửi Gmail
          </Button>
          <Button
            variant="primary"
            leftIcon={<FolderSync className="h-4 w-4" />}
            loading={syncingDrive}
            onClick={handleSyncDrive}
          >
            Đồng bộ &amp; Quét Drive
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Kết nối Gmail & Drive"
          value={status?.connected ? 'Đã kết nối' : 'Chưa kết nối'}
          subtitle={status?.connectedEmail || 'Bấm Kết nối Google để cấp quyền'}
          icon={<Cloud className="h-5 w-5" />}
          tone={status?.connected ? 'emerald' : 'amber'}
          loading={loading}
        />
        <StatCard
          title="Tệp Drive được bảo vệ"
          value={status?.syncedDocumentsCount ?? 0}
          subtitle="Đã tạo chữ ký SHA-256"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="cyan"
          loading={loading}
        />
        <StatCard
          title="Dữ liệu Web Clipper"
          value={clips.length}
          subtitle="Từ Google, Facebook & Web"
          icon={<Sparkles className="h-5 w-5" />}
          tone="default"
          loading={loading}
        />
        <StatCard
          title="Lần đồng bộ gần nhất"
          value={
            status?.driveSyncedAt
              ? new Date(status.driveSyncedAt).toLocaleTimeString('vi-VN')
              : 'Chưa đồng bộ'
          }
          subtitle={
            status?.googleConfigured
              ? 'Google OAuth2 đã cấu hình'
              : 'Thiếu GOOGLE_CLIENT_ID trong .env'
          }
          icon={<RefreshCw className="h-5 w-5" />}
          tone="emerald"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Form Smart Web Clipper */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-cyan-500" />
              Trình lưu nhanh Web Clipper AI (Google / Facebook)
            </h2>
            {!status?.connected && (
              <Button variant="secondary" size="sm" onClick={handleConnectGoogle}>
                Kết nối Gmail/Drive
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Cài tiện ích trong thư mục <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">chrome-extension/</code> để bôi đen trực tiếp trên Google/Facebook, hoặc thử nghiệm ngay bên dưới:
          </p>

          <form onSubmit={handleSubmitClip} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nền tảng nguồn
                </label>
                <select
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value as 'google' | 'facebook' | 'web')}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="web">Trang web khác</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tiêu đề trang (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="VD: Thông tư thuế 2026 trên Facebook"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                URL nguồn
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Đoạn dữ liệu đã chọn
              </label>
              <textarea
                rows={4}
                required
                value={selectedText}
                onChange={(e) => setSelectedText(e.target.value)}
                placeholder="Dán đoạn văn bản từ Google hoặc Facebook để AI phân loại, tạo SHA-256 và lưu vào kho cá nhân..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={notifyGmail}
                onChange={(e) => setNotifyGmail(e.target.checked)}
              />
              Gửi bản tóm tắt về Gmail sau khi phân loại
            </label>

            <Button type="submit" variant="primary" fullWidth loading={clipping}>
              AI Phân loại &amp; Lưu vào DocuGuard + Drive
            </Button>
          </form>
        </div>

        {/* Google Drive Files & Recent Clips */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <FileCode2 className="h-5 w-5 text-emerald-500" />
              Dữ liệu đã lưu từ Web Clipper ({clips.length})
            </h2>
            <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1">
              {clips.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chưa có đoạn dữ liệu nào được lưu từ Google hoặc Facebook.
                </p>
              ) : (
                clips.map((clip) => (
                  <div
                    key={clip._id}
                    className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {clip.title}
                      </p>
                      <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-500">
                        {clip.category}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {clip.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {String((clip as any).metadata?.sourcePlatform || 'web').toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" />
                        SHA-256: {clip.fileHash.slice(0, 10)}...
                      </span>
                      {Boolean((clip as any).metadata?.driveWebViewLink) && (
                        <a
                          href={String((clip as any).metadata?.driveWebViewLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-cyan-400 hover:underline"
                        >
                          Drive <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Cloud className="h-5 w-5 text-blue-500" />
              Tệp trên Google Drive ({driveFiles.length})
            </h2>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
              {driveFiles.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {status?.connected
                    ? 'Không có tệp nào trong Google Drive hoặc bấm "Đồng bộ & Quét Drive".'
                    : 'Đăng nhập bằng Google để xem và quét tài liệu từ Google Drive.'}
                </p>
              ) : (
                driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800"
                  >
                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                      {file.name}
                    </span>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 shrink-0 text-cyan-500 hover:underline"
                      >
                        Mở Drive
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
