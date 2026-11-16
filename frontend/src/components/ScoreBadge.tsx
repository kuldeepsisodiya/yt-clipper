import React from 'react';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = 'md', showLabel = false }) => {
  let colorClasses = 'text-accent-coral border-accent-coral/30 bg-accent-coral/10';
  if (score >= 85) {
    colorClasses = 'text-[#FF795F] border-[#FF795F]/40 bg-[#FF795F]/15 shadow-[0_0_12px_rgba(255,121,95,0.25)]';
  } else if (score >= 70) {
    colorClasses = 'text-[#A99AEF] border-[#A99AEF]/40 bg-[#A99AEF]/15 shadow-[0_0_12px_rgba(169,154,239,0.2)]';
  } else if (score >= 50) {
    colorClasses = 'text-[#75D6A0] border-[#75D6A0]/40 bg-[#75D6A0]/15';
  } else {
    colorClasses = 'text-secondary-text border-white/10 bg-white/5';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-semibold px-2.5 py-1',
    lg: 'text-sm font-bold px-3 py-1.5',
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${colorClasses} font-mono tracking-tight transition-all`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{score}</span>
      {showLabel && <span className="text-[10px] uppercase tracking-wider opacity-70">/ 100</span>}
    </div>
  );
};
