import React from 'react';
import {
  X,
  Flame,
  Scissors,
  CheckCircle,
  Star,
  Trash2,
  Clock,
  Activity,
  MessageSquare,
  Volume2,
} from 'lucide-react';
import { Highlight } from '../types';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';

interface HighlightDetailModalProps {
  highlight: Highlight | null;
  onClose: () => void;
  onOpenClipEditor: (h: Highlight) => void;
  onToggleFavorite: (id: string) => void;
  onMarkReviewed: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
}

export const HighlightDetailModal: React.FC<HighlightDetailModalProps> = ({
  highlight,
  onClose,
  onOpenClipEditor,
  onToggleFavorite,
  onMarkReviewed,
  onDeleteHighlight,
}) => {
  if (!highlight) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-white/15 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6 relative">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <ScoreBadge score={highlight.score} size="lg" showLabel />
            <div>
              <h3 className="font-display font-bold text-base text-primary-text">
                {highlight.category}
              </h3>
              <span className="text-xs text-secondary-text font-mono">
                Offset {Math.floor(highlight.timestamp_offset / 60)}m {Math.floor(highlight.timestamp_offset % 60)}s • {highlight.duration_sec.toFixed(0)}s duration
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text hover:bg-white/5 transition-colors interactive-tap"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video preview / thumbnail */}
        <div className="relative aspect-video rounded-xl bg-black border border-white/10 overflow-hidden">
          {highlight.thumbnail_url ? (
            <img src={highlight.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-secondary-text font-mono">
              Raw clip preview stream ready
            </div>
          )}
          <div className="absolute top-3 right-3">
            <StatusBadge status={highlight.status} />
          </div>
        </div>

        {/* Detection Reasons & Multi-Signal Breakdown */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-white/5 space-y-3">
          <h4 className="text-xs uppercase tracking-wider font-mono font-semibold text-secondary-text flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-accent-coral" />
            Detection Multi-Signal Analysis
          </h4>

          <div className="space-y-1.5 text-xs">
            {highlight.reasons && highlight.reasons.length > 0 ? (
              highlight.reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-primary-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-coral" />
                  <span>{r}</span>
                </div>
              ))
            ) : (
              <span className="text-secondary-text">Velocity spike threshold tripped</span>
            )}
          </div>

          {highlight.speech_text && (
            <div className="pt-2 border-t border-white/5 text-xs">
              <span className="text-secondary-text block text-[11px] font-mono">Streamer Speech Audio:</span>
              <p className="text-primary-text italic mt-0.5">"{highlight.speech_text}"</p>
            </div>
          )}
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(highlight.id)}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all interactive-tap ${
                highlight.is_favorite
                  ? 'border-accent-coral bg-accent-coral/15 text-accent-coral'
                  : 'border-white/10 text-secondary-text hover:text-primary-text'
              }`}
            >
              <Star className={`w-4 h-4 ${highlight.is_favorite ? 'fill-current' : ''}`} />
              <span>{highlight.is_favorite ? 'Starred' : 'Star'}</span>
            </button>

            <button
              onClick={() => onMarkReviewed(highlight.id)}
              className="p-2 rounded-lg border border-white/10 hover:border-white/20 text-xs text-secondary-text hover:text-status-success flex items-center gap-1.5 transition-colors interactive-tap"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark Reviewed</span>
            </button>

            <button
              onClick={() => {
                onDeleteHighlight(highlight.id);
                onClose();
              }}
              className="p-2 rounded-lg border border-white/10 hover:border-status-error/40 text-xs text-secondary-text hover:text-status-error transition-colors interactive-tap"
              title="Delete Highlight"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              onOpenClipEditor(highlight);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-accent-coral hover:brightness-110 text-white font-semibold text-xs flex items-center gap-1.5 transition-all interactive-tap shadow-coral-glow"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Open in Clip Editor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
