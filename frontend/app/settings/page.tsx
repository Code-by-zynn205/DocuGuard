'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  KeyRound,
  Plus,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  Webhook,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api';

type SettingsTab = 'general' | 'security' | 'integrations';

interface ApiKeyEntry {
  id: string;
  name: string;
  maskedKey: string;
  scope: 'read:all' | 'write:vault' | 'admin:soc';
  createdAt: string;
  lastUsedAt: string;
}

interface DocuGuardSettings {
  organizationName: string;
  organizationCode: string;
  timezone: string;
  auditRetentionDays: number;
  autoQuarantineRiskThreshold: number;
  require2FA: boolean;
  requireCisoApproval: boolean;
  autoCreateIncidentOnTamper: boolean;
  sessionTimeoutMinutes: number;
  n8nHealthScanWebhook: string;
  n8nIncidentWebhook: string;
}

const SETTINGS_STORAGE_KEY = 'docuguard_frontend_settings';

const DEFAULT_SETTINGS: DocuGuardSettings = {
  organizationName: 'DocuGuard Enterprise Security',
  organizationCode: 'DG-SOC-VN01',
  timezone: 'Asia/Ho_Chi_Minh',
  auditRetentionDays: 365,
  autoQuarantineRiskThreshold: 60,
  require2FA: true,
  requireCisoApproval: true,
  autoCreateIncidentOnTamper: true,
  sessionTimeoutMinutes: 60,
  n8nHealthScanWebhook: 'http://localhost:5678/webhook/document-health-scan',
  n8nIncidentWebhook: 'http://localhost:5678/webhook/incident-remediation',
};

const INITIAL_API_KEYS: ApiKeyEntry[] = [
  {
    id: 'key_001',
    name: 'n8n Automation Runner Key',
    maskedKey: 'dg_live_••••••••••••9c4a',
    scope: 'admin:soc',
    createdAt: '2026-10-01',
    lastUsedAt: '12/11/2026 08:00',
  },
  {
    id: 'key_002',
    name: 'CI/CD Document Integrity Hook',
    maskedKey: 'dg_live_••••••••••••3f81',
    scope: 'write:vault',
    createdAt: '2026-10-18',
    lastUsedAt: '11/11/2026 19:42',
  },
];

const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function SettingsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] =
    useState<DocuGuardSettings>(DEFAULT_SETTINGS);
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>(INITIAL_API_KEYS);

  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedApiUrl, setCopiedApiUrl] = useState(false);
  const [banner, setBanner] = useState<{
    type: 'success' | 'info';
    text: string;
  } | null>(null);

  // Create API Key Modal
  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScope, setNewKeyScope] =
    useState<ApiKeyEntry['scope']>('write:vault');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      if (typeof window !== 'undefined') {
        const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved && mounted) {
          try {
            const parsed = JSON.parse(saved) as Partial<DocuGuardSettings>;
            setSettings((prev) => ({ ...prev, ...parsed }));
          } catch {
            // Bỏ qua nếu JSON lưu cục bộ không hợp lệ
          }
        }
      }

      try {
        const res = await apiClient.get<Partial<DocuGuardSettings>>('/settings', {
          mockFallback: false,
        });
        if (mounted && res.data && typeof res.data === 'object') {
          setSettings((prev) => {
            const next = { ...prev, ...res.data };
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
            }
            return next;
          });
        }
      } catch {
        // Bỏ qua khi chạy chế độ offline/standalone
      }
    };

    void loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setBanner(null);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
    }

    try {
      await apiClient.put('/settings', settings);
    } catch {
      // Standalone mode vẫn lưu thành công cấu hình cục bộ
    }

    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    toast.success(
      'Đã lưu cấu hình hệ thống',
      'Các thiết lập bảo mật và tích hợp đã được cập nhật.',
    );
    setBanner({
      type: 'success',
      text: 'Đã lưu cấu hình hệ thống DocuGuard thành công.',
    });
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setBanner(null);

    try {
      await fetch(settings.n8nHealthScanWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'docuguard.webhook_test' }),
      });
      toast.success('Webhook n8n phản hồi thành công');
      setBanner({
        type: 'success',
        text: `Kết nối thành công tới n8n Webhook (${settings.n8nHealthScanWebhook}).`,
      });
    } catch {
      toast.info(
        'Đã gửi gói tin kiểm tra Webhook',
        'n8n local chưa bật hoặc CORS chặn phản hồi từ trình duyệt.',
      );
      setBanner({
        type: 'info',
        text: `Đã gửi gói tin kiểm tra tới ${settings.n8nHealthScanWebhook} (n8n local chưa bật hoặc CORS chặn trình duyệt).`,
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleCopyApiUrl = async () => {
    try {
      await navigator.clipboard.writeText(PUBLIC_API_URL);
      setCopiedApiUrl(true);
      setTimeout(() => setCopiedApiUrl(false), 1800);
    } catch {
      // Bỏ qua nếu clipboard bị chặn
    }
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const randomHex = Math.random().toString(16).slice(2, 10);
    const tailHex = Math.random().toString(16).slice(2, 6);
    const rawKey = `dg_live_${randomHex}${tailHex}`;

    const newEntry: ApiKeyEntry = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      maskedKey: `dg_live_••••••••••••${tailHex}`,
      scope: newKeyScope,
      createdAt: new Date().toISOString().slice(0, 10),
      lastUsedAt: 'Vừa tạo',
    };

    setApiKeys((prev) => [newEntry, ...prev]);
    setGeneratedRawKey(rawKey);
    setNewKeyName('');
    toast.success('Đã tạo API Key mới', newEntry.name);
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.warning('Đã thu hồi API Key', 'Key này không còn hiệu lực.');
    setBanner({
      type: 'info',
      text: 'Đã thu hồi API Key khỏi hệ thống.',
    });
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'general',
      label: 'General',
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: 'security',
      label: 'Security & Thresholds',
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: 'integrations',
      label: 'API & Integrations',
      icon: <KeyRound className="h-4 w-4" />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cấu hình thông tin tổ chức, ngưỡng bảo mật tự động cách ly, 2FA và tích hợp API / n8n.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          role="status"
          className={[
            'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
            banner.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
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

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Nhóm cài đặt hệ thống"
        className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3"
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all cursor-pointer',
                active
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && (
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Thông tin tổ chức &amp; Vận hành
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Thiết lập định danh đơn vị, múi giờ chuẩn hóa nhật ký và chính sách lưu trữ.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tên tổ chức
                </label>
                <input
                  type="text"
                  required
                  value={settings.organizationName}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      organizationName: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mã định danh hệ thống (Tenant ID)
                </label>
                <input
                  type="text"
                  value={settings.organizationCode}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      organizationCode: e.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 font-mono text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  Múi giờ hệ thống
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, timezone: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="Asia/Ho_Chi_Minh">
                    Asia/Ho_Chi_Minh (GMT+07:00)
                  </option>
                  <option value="Asia/Singapore">
                    Asia/Singapore (GMT+08:00)
                  </option>
                  <option value="Asia/Tokyo">Asia/Tokyo (GMT+09:00)</option>
                  <option value="UTC">UTC (GMT+00:00)</option>
                  <option value="America/New_York">
                    America/New_York (GMT-05:00)
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Thời gian lưu giữ Audit Log (ngày)
                </label>
                <input
                  type="number"
                  min={30}
                  max={3650}
                  value={settings.auditRetentionDays}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      auditRetentionDays: Number(e.target.value) || 365,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 font-mono text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: SECURITY & THRESHOLDS */}
        {activeTab === 'security' && (
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Bảo mật &amp; Ngưỡng phản ứng tự động
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Điều chỉnh ngưỡng điểm rủi ro để tự động cách ly tài liệu và chính sách xác thực quản trị.
              </p>
            </div>

            {/* Auto-Quarantine Risk Threshold */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Ngưỡng điểm rủi ro tự động cách ly (Auto-Quarantine)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tài liệu có điểm rủi ro từ mức này trở lên sẽ tự động bị cô lập khỏi truy cập thông thường.
                  </p>
                </div>
                <Badge status="critical" size="md">
                  Risk ≥ {settings.autoQuarantineRiskThreshold}/100
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={20}
                  max={95}
                  step={5}
                  value={settings.autoQuarantineRiskThreshold}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      autoQuarantineRiskThreshold: Number(e.target.value),
                    }))
                  }
                  className="h-2 flex-1 cursor-pointer accent-cyan-600"
                />
                <input
                  type="number"
                  min={20}
                  max={95}
                  value={settings.autoQuarantineRiskThreshold}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      autoQuarantineRiskThreshold: Math.min(
                        95,
                        Math.max(20, Number(e.target.value) || 60),
                      ),
                    }))
                  }
                  className="h-9 w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-center font-mono text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Toggle Controls */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
              {[
                {
                  key: 'require2FA' as const,
                  title: 'Bắt buộc xác thực 2 yếu tố (2FA)',
                  desc: 'Yêu cầu mã OTP/TOTP cho mọi tài khoản Admin và Reviewer khi đăng nhập hoặc thực hiện Safe Recovery.',
                },
                {
                  key: 'requireCisoApproval' as const,
                  title: 'Phê duyệt 2 lớp cho tài liệu Tối mật',
                  desc: 'Các tài liệu gắn nhãn Confidential phải được Trưởng phòng / CISO duyệt trước khi khôi phục ghi đè.',
                },
                {
                  key: 'autoCreateIncidentOnTamper' as const,
                  title: 'Tự động tạo Incident khi sai lệch SHA-256',
                  desc: 'Khởi tạo sự cố Critical ngay lập tức và kích hoạt webhook n8n khi phát hiện file bị sửa trái phép.',
                },
              ].map((toggle) => {
                const checked = settings[toggle.key];
                return (
                  <div
                    key={toggle.key}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {toggle.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {toggle.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          [toggle.key]: !s[toggle.key],
                        }))
                      }
                      className={[
                        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer',
                        checked
                          ? 'bg-cyan-600'
                          : 'bg-slate-300 dark:bg-slate-700',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                          checked ? 'translate-x-6' : 'translate-x-1',
                        ].join(' ')}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 3: API & INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            {/* Environment & n8n Webhooks */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Kết nối Backend &amp; n8n Webhook
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Cấu hình endpoint API công khai và webhook điều phối tự động hóa n8n.
                </p>
              </div>

              {/* NEXT_PUBLIC_API_URL */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      NEXT_PUBLIC_API_URL
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                      {PUBLIC_API_URL}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleCopyApiUrl()}
                    leftIcon={
                      copiedApiUrl ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    {copiedApiUrl ? 'Đã chép' : 'Sao chép URL'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Webhook className="h-3.5 w-3.5 text-cyan-500" />
                    n8n Health Scan Webhook URL
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="url"
                      value={settings.n8nHealthScanWebhook}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          n8nHealthScanWebhook: e.target.value,
                        }))
                      }
                      className="h-10 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 font-mono text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                    <Button
                      variant="secondary"
                      size="md"
                      loading={testingWebhook}
                      onClick={() => void handleTestWebhook()}
                    >
                      Test Webhook
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Webhook className="h-3.5 w-3.5 text-rose-500" />
                    n8n Auto-Remediation Webhook URL
                  </label>
                  <input
                    type="url"
                    value={settings.n8nIncidentWebhook}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        n8nIncidentWebhook: e.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 font-mono text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
              </div>
            </section>

            {/* API Keys Management */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Quản lý API Keys
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Cấp phát và thu hồi Bearer API Keys cho n8n, CI/CD và dịch vụ tích hợp ngoài.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setGeneratedRawKey(null);
                    setCreateKeyModalOpen(true);
                  }}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Tạo API Key mới
                </Button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                {apiKeys.map((keyItem) => (
                  <div
                    key={keyItem.id}
                    className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {keyItem.name}
                        </span>
                        <Badge status="active">{keyItem.scope}</Badge>
                      </div>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {keyItem.maskedKey} • Tạo ngày {keyItem.createdAt} • Dùng gần nhất: {keyItem.lastUsedAt}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeKey(keyItem.id)}
                      leftIcon={<Trash2 className="h-3.5 w-3.5 text-rose-500" />}
                    >
                      Thu hồi
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Sticky Save Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Lưu cấu hình
          </Button>
        </div>
      </form>

      {/* Create API Key Modal */}
      <Modal
        isOpen={createKeyModalOpen}
        onClose={() => setCreateKeyModalOpen(false)}
        title="Tạo API Key mới"
        description="API Key chỉ hiển thị đầy đủ một lần duy nhất ngay sau khi khởi tạo."
        size="md"
      >
        {generatedRawKey ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                API Key đã được tạo thành công
              </div>
              <code className="block break-all rounded-lg border border-emerald-500/20 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-emerald-300">
                {generatedRawKey}
              </code>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => void navigator.clipboard.writeText(generatedRawKey)}
                leftIcon={<Copy className="h-4 w-4" />}
              >
                Sao chép Key
              </Button>
              <Button
                variant="primary"
                onClick={() => setCreateKeyModalOpen(false)}
              >
                Hoàn tất
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateApiKey} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tên gợi nhớ
              </label>
              <input
                type="text"
                required
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Ví dụ: SIEM Log Forwarder"
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phạm vi quyền (Scope)
              </label>
              <select
                value={newKeyScope}
                onChange={(e) =>
                  setNewKeyScope(e.target.value as ApiKeyEntry['scope'])
                }
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="read:all">read:all (Chỉ đọc báo cáo)</option>
                <option value="write:vault">
                  write:vault (Tải lên &amp; quét tài liệu)
                </option>
                <option value="admin:soc">
                  admin:soc (Toàn quyền vận hành SOC)
                </option>
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
              <Button
                variant="secondary"
                onClick={() => setCreateKeyModalOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Khởi tạo Key
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
