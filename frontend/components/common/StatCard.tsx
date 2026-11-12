import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export type StatCardTone = 'default' | 'cyan' | 'emerald' | 'amber' | 'rose';

export interface StatCardTrend {
  value: string | number;
  label?: string;
  direction?: 'up' | 'down' | 'neutral';
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: StatCardTrend;
  tone?: StatCardTone;
  loading?: boolean;
  className?: string;
}

const TONE_STYLES: Record<
  StatCardTone,
  { card: string; iconBox: string; value: string }
> = {
  default: {
    card: 'border-slate-200 dark:border-slate-800',
    iconBox:
      'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300',
    value: 'text-slate-900 dark:text-white',
  },
  cyan: {
    card: 'border-cyan-500/25 dark:border-cyan-500/30',
    iconBox: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    value: 'text-cyan-700 dark:text-cyan-300',
  },
  emerald: {
    card: 'border-emerald-500/25 dark:border-emerald-500/30',
    iconBox: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-400',
  },
  amber: {
    card: 'border-amber-500/25 dark:border-amber-500/30',
    iconBox: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-400',
  },
  rose: {
    card: 'border-rose-500/30 dark:border-rose-500/35',
    iconBox: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    value: 'text-rose-700 dark:text-rose-400',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  tone = 'default',
  loading = false,
  className = '',
}: StatCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={[
        'relative overflow-hidden rounded-xl border bg-white dark:bg-slate-900/90 p-5 shadow-xs transition-all duration-150 hover:shadow-md',
        styles.card,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          ) : (
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold tracking-tight tabular-nums ${styles.value}`}
              >
                {value}
              </span>
            </div>
          )}
        </div>

        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.iconBox}`}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          {trend ? (
            <span
              className={[
                'inline-flex items-center gap-1 font-medium',
                trend.direction === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : trend.direction === 'down'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400',
              ].join(' ')}
            >
              {trend.direction === 'up' && (
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {trend.direction === 'down' && (
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {(!trend.direction || trend.direction === 'neutral') && (
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{trend.value}</span>
              {trend.label && (
                <span className="text-slate-500 dark:text-slate-400 font-normal">
                  {trend.label}
                </span>
              )}
            </span>
          ) : (
            <span />
          )}

          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
