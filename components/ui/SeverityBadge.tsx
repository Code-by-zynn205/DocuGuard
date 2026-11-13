import React from 'react';
import { SeverityLevel } from '@/types';
import { AlertCircle, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';

interface SeverityBadgeProps {
  level: SeverityLevel;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ level }) => {
  const configs: Record<SeverityLevel, { style: string; label: string; icon: React.ReactNode }> = {
    low: {
      style: 'bg-blue-50 text-blue-700 border-blue-200/80',
      label: 'THẤP',
      icon: <ShieldCheck className="w-3 h-3 text-blue-600" />,
    },
    medium: {
      style: 'bg-amber-50 text-amber-700 border-amber-200/80',
      label: 'TRUNG BÌNH',
      icon: <AlertCircle className="w-3 h-3 text-amber-600" />,
    },
    high: {
      style: 'bg-orange-50 text-orange-700 border-orange-200/80',
      label: 'CAO',
      icon: <AlertTriangle className="w-3 h-3 text-orange-600" />,
    },
    critical: {
      style: 'bg-rose-50 text-rose-700 border-rose-200/80 animate-pulse',
      label: 'NGHIÊM TRỌNG',
      icon: <ShieldAlert className="w-3 h-3 text-rose-600" />,
    },
  };

  const current = configs[level] || configs.low;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm ${current.style}`}>
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};

export default SeverityBadge;