import React from 'react';
import { HealthStatus } from '@/types';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

interface HealthBadgeProps {
  score: number;
  status: HealthStatus;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ score, status }) => {
  let styleConfig = {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
    text: 'KHỎE MẠNH',
  };

  if (status === 'warning' || (score >= 50 && score < 80)) {
    styleConfig = {
      color: 'bg-amber-50 text-amber-700 border-amber-200/80',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
      text: 'CẢNH BÁO',
    };
  } else if (status === 'critical' || score < 50) {
    styleConfig = {
      color: 'bg-rose-50 text-rose-700 border-rose-200/80 animate-pulse',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />,
      text: 'NGUY HIỂM',
    };
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all ${styleConfig.color}`}>
      {styleConfig.icon}
      <span>{score}/100</span>
      <span className="opacity-40">•</span>
      <span className="tracking-wider">{styleConfig.text}</span>
    </div>
  );
};

export default HealthBadge;