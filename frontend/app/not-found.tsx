import Link from 'next/link';
import { FileSearch, Home, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants';

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
          <ShieldQuestion className="h-7 w-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            HTTP 404 — Not Found
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Không tìm thấy trang yêu cầu
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Đường dẫn bạn truy cập không tồn tại hoặc tài nguyên đã được chuyển sang phân vùng khác trong DocuGuard.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href={ROUTES.DASHBOARD}>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Home className="h-4 w-4" />}
            >
              Về Dashboard
            </Button>
          </Link>
          <Link href={ROUTES.DOCUMENTS}>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FileSearch className="h-4 w-4" />}
            >
              Mở Document Vault
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
