import React from 'react';

interface HealthBadgeProps {
  score: number;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ score }) => {
  let colorClasses = 'bg-green-100 text-green-800 border-green-300';
  let label = 'Healthy';

  if (score < 50) {
    colorClasses = 'bg-red-100 text-red-800 border-red-300';
    label = 'Critical';
  } else if (score < 80) {
    colorClasses = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    label = 'Warning';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses}`}>
      <span className="font-bold">{score}/100</span> • {label}
    </span>
  );
};