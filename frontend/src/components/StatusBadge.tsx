import React from 'react';
import { ProcessingStatus } from '../types';

interface StatusBadgeProps {
  status: ProcessingStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs: Record<ProcessingStatus, { bg: string; text: string; border: string; dot: string; pulse?: boolean }> = {
    Detected: {
      bg: 'bg-white/5',
      text: 'text-secondary-text',
      border: 'border-white/10',
      dot: 'bg-secondary-text',
    },
    Processing: {
      bg: 'bg-accent-lavender/10',
      text: 'text-accent-lavender',
      border: 'border-accent-lavender/30',
      dot: 'bg-accent-lavender',
      pulse: true,
    },
    Ready: {
      bg: 'bg-status-success/10',
      text: 'text-status-success',
      border: 'border-status-success/30',
      dot: 'bg-status-success',
    },
    Failed: {
      bg: 'bg-status-error/10',
      text: 'text-status-error',
      border: 'border-status-error/30',
      dot: 'bg-status-error',
    },
    Reviewed: {
      bg: 'bg-accent-coral/10',
      text: 'text-accent-coral',
      border: 'border-accent-coral/30',
      dot: 'bg-accent-coral',
    },
  };

  const c = configs[status] || configs.Detected;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
};
