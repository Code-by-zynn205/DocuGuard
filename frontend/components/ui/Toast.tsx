'use client';

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant'>> {
  id: string;
  description?: string;
  durationMs: number;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; iconWrap: string; title: string; icon: React.ReactNode }
> = {
  success: {
    container: 'border-emerald-500/35 dark:border-emerald-500/40',
    iconWrap: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-800 dark:text-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
  },
  error: {
    container: 'border-rose-500/35 dark:border-rose-500/40',
    iconWrap: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    title: 'text-rose-800 dark:text-rose-200',
    icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
  },
  warning: {
    container: 'border-amber-500/35 dark:border-amber-500/40',
    iconWrap: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    title: 'text-amber-800 dark:text-amber-200',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  },
  info: {
    container: 'border-cyan-500/35 dark:border-cyan-500/40',
    iconWrap: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    title: 'text-cyan-800 dark:text-cyan-200',
    icon: <Info className="h-4 w-4" aria-hidden="true" />,
  },
};

const DEFAULT_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = 'info',
      durationMs = DEFAULT_DURATION_MS,
    }: ToastOptions): string => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => [
        ...prev.slice(-4),
        { id, title, description, variant, durationMs },
      ]);

      if (durationMs > 0) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, durationMs);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) =>
        toast({ title, description, variant: 'success' }),
      error: (title, description) =>
        toast({ title, description, variant: 'error' }),
      warning: (title, description) =>
        toast({ title, description, variant: 'warning' }),
      info: (title, description) =>
        toast({ title, description, variant: 'info' }),
      dismiss,
      clearAll,
    }),
    [toast, dismiss, clearAll],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Viewport */}
      <div
        aria-live="polite"
        aria-label="Thông báo hệ thống"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const style = VARIANT_STYLES[item.variant];
          return (
            <div
              key={item.id}
              role="status"
              className={[
                'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-xl shadow-slate-950/20 backdrop-blur-md transition-all',
                style.container,
              ].join(' ')}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.iconWrap}`}
              >
                {style.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold ${style.title}`}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Đóng thông báo"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
