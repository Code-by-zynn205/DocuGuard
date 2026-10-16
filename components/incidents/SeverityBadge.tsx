import React from 'react';

type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

interface SeverityBadgeProps {
  level: SeverityLevel;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ level }) => {
  const styles: Record<SeverityLevel, string> = {
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    medium: 'bg-orange-100 text-orange-800 border-orange-200',
    high: 'bg-red-100 text-red-800 border-red-200',
    critical: 'bg-purple-900 text-white font-semibold',
  };

  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs uppercase rounded border ${styles[level] || styles.low}`}>
      {level}
    </span>
  );
};