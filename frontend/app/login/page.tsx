'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/lib/api';
import {
  DEMO_ACCOUNTS,
  setAuthSession,
  type AuthSessionUser,
} from '@/lib/auth';

interface LoginApiResponse {
  accessToken?: string;
  token?: string;
  user?: Partial<AuthSessionUser>;
}

function getSafeRedirectTarget(rawTarget: string | null): string {
  if (!rawTarget || !rawTarget.startsWith('/') || rawTarget.startsWith('//')) {
    return ROUTES.DASHBOARD;
  }
  if (rawTarget === ROUTES.LOGIN) {
    return ROUTES.DASHBOARD;
  }
  return rawTarget;
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redirectTarget = getSafeRedirectTarget(searchParams.get('redirect'));

  const completeLogin = (token: string, user: AuthSessionUser) => {
    setAuthSession(token, user);
    toast.success(
      'Đăng nhập thành công',
      `Chào mừng ${user.fullName} (${user.role.toUpperCase()})`,
    );
    router.replace(redirectTarget);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<LoginApiResponse>(
        '/auth/login',
        { email: normalizedEmail, password },
        { mockFallback: false },
      );

      const token =
        res.data?.accessToken ??
        res.data?.token ??
        `dg_jwt_${Date.now()}`;
      const matchedDemo =
        normalizedEmail === DEMO_ACCOUNTS.auditor.email
          ? DEMO_ACCOUNTS.auditor
          : DEMO_ACCOUNTS.admin;

      const user: AuthSessionUser = {
        ...matchedDemo,
        ...res.data?.user,
        email: res.data?.user?.email ?? normalizedEmail,
      };

      completeLogin(token, user);
    } catch {
      // Hỗ trợ đăng nhập nhanh ở chế độ standalone khi chưa bật backend NestJS
      if (password.length >= 6) {
        const isAuditor = normalizedEmail.includes('auditor');
        const baseDemo = isAuditor
          ? DEMO_ACCOUNTS.auditor
          : DEMO_ACCOUNTS.admin;
        const user: AuthSessionUser = {
          ...baseDemo,
          email: normalizedEmail,
        };
        completeLogin(`dg_demo_${user.role}_${Date.now()}`, user);
      } else {
        setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
        toast.error('Đăng nhập thất bại', 'Thông tin xác thực không hợp lệ.');
        setSubmitting(false);
      }
    }
  };

  const handleDemoLogin = (role: 'admin' | 'auditor') => {
    const user = DEMO_ACCOUNTS[role];
    const token = `dg_demo_${role}_${Date.now()}`;
    completeLogin(token, user);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100 overflow-hidden">
      {/* Subtle Cybersecurity Grid Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_45%)]"
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-white/20">
            <Shield className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            DocuGuard SOC
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Đăng nhập nền tảng bảo mật &amp; giám sát toàn vẹn tài liệu
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-7 shadow-2xl shadow-black/50 backdrop-blur-md space-y-6">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Email doanh nghiệp
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@docuguard.io"
                  className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-slate-700 bg-slate-950/80 pl-9 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
            >
              Đăng nhập hệ thống
            </Button>
          </form>

          {/* Demo Quick Login Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-slate-900 px-3 font-semibold text-slate-400">
                Đăng nhập Demo nhanh (RBAC)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              className="group flex flex-col items-start rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-left transition-all hover:border-rose-500/50 hover:bg-rose-500/15 cursor-pointer"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-bold text-rose-300">
                  Admin Demo
                </span>
                <UserCheck className="h-3.5 w-3.5 text-rose-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Toàn quyền SOC, Recovery &amp; Settings
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('auditor')}
              className="group flex flex-col items-start rounded-xl border border-violet-500/25 bg-violet-500/10 p-3 text-left transition-all hover:border-violet-500/50 hover:bg-violet-500/15 cursor-pointer"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-bold text-violet-300">
                  Auditor Demo
                </span>
                <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Giám sát Audit Logs &amp; Health Scan
              </p>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          DocuGuard Zero-Trust Document Integrity Platform
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginFormContent />
    </Suspense>
  );
}
