'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RotateCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[DocuGuard Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-white dark:bg-slate-900/95 p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Runtime Exception
          </span>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Đã xảy ra sự cố khi hiển thị giao diện
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hệ thống phát hiện lỗi không mong muốn trong phiên làm việc. Dữ liệu trong Document Vault vẫn được bảo vệ an toàn.
          </p>
        </div>

        {(error.message || error.digest) && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3.5 text-left font-mono text-xs text-slate-600 dark:text-slate-300 space-y-1">
            {error.message && (
              <p className="break-words text-rose-600 dark:text-rose-400">
                {error.message}
              </p>
            )}
            {error.digest && (
              <p className="text-[11px] text-slate-400">
                Trace Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Thử lại
          </Button>
          <Link href={ROUTES.DASHBOARD}>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Home className="h-4 w-4" />}
            >
              Về Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
