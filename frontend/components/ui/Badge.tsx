import React from 'react';
import {
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
  type StatusColorKey,
} from '@/constants';
import type { IncidentSeverity } from '@/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusColorKey;
  severity?: IncidentSeverity;
  showDot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({
  status,
  severity,
  showDot = false,
  pulse = false,
  size = 'sm',
  className = '',
  children,
  ...props
}: BadgeProps) {
  let colorClasses =
    'bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/25';
  let dotClasses = 'bg-slate-400';
  let defaultLabel: string | undefined;

  if (severity) {
    colorClasses = SEVERITY_COLORS[severity];
    dotClasses =
      severity === 'critical'
        ? 'bg-rose-500'
        : severity === 'high'
          ? 'bg-orange-500'
          : severity === 'medium'
            ? 'bg-amber-500'
            : 'bg-sky-500';
    defaultLabel = SEVERITY_LABELS[severity];
  } else if (status) {
    colorClasses = STATUS_COLORS[status];
    dotClasses = STATUS_DOT_COLORS[status];
    defaultLabel = STATUS_LABELS[status];
  }

  const sizeClasses =
    size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium tracking-tight whitespace-nowrap',
        sizeClasses,
        colorClasses,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotClasses}`}
            />
          )}
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotClasses}`}
          />
        </span>
      )}
      <span>{children ?? defaultLabel}</span>
    </span>
  );
}
