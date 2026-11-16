import React, { useState } from 'react';
import {
  Flame,
  Star,
  Clock,
  Filter,
  Trash2,
  CheckCircle,
  Scissors,
  Play,
  RotateCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Highlight, GTAEventCategory } from '../types';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';

interface HighlightsExplorerProps {
  highlights: Highlight[];
  onSelectHighlight: (h: Highlight) => void;
  onOpenClipEditor: (h: Highlight) => void;
  onToggleFavorite: (id: string) => void;
  onMarkReviewed: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
}

export const HighlightsExplorer: React.FC<HighlightsExplorerProps> = ({
  highlights,
  onSelectHighlight,
  onOpenClipEditor,
  onToggleFavorite,
  onMarkReviewed,
  onDeleteHighlight,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);

  const filterTabs = [
    { id: 'all', label: 'All Highlights' },
    { id: 'highest', label: 'Highest Score' },
    { id: 'Police Chase', label: 'Police Chases' },
    { id: 'Shootout & Combat', label: 'Combat' },
    { id: 'Vehicle Crash', label: 'Crashes' },
    { id: 'Funny NPC Interaction', label: 'Funny NPCs' },
    { id: 'Vehicle Stunt', label: 'Stunts' },
    { id: 'Streamer Reaction', label: 'Reactions' },
    { id: 'favorites', label: 'Starred' },
  ];

  // Filtering & Sorting
  let filtered = highlights.filter((h) => {
    if (minScoreFilter > 0 && h.score < minScoreFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCat = h.category.toLowerCase().includes(q);
      const matchReason = h.reasons.some((r) => r.toLowerCase().includes(q));
      if (!matchCat && !matchReason) return false;
    }
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'highest') return true;
    if (selectedFilter === 'favorites') return h.is_favorite;
    return h.category === selectedFilter;
  });

  if (selectedFilter === 'highest') {
    filtered = [...filtered].sort((a, b) => b.score - a.score);
  } else {
    filtered = [...filtered].sort((a, b) => b.timestamp_offset - a.timestamp_offset);
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filter bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
        <div>
          <h2 className="font-display font-semibold text-lg text-primary-text">
            Highlights Explorer
          </h2>
          <p className="text-xs text-secondary-text">
            Browse multi-signal GTA VI events sorted by highlight score & creator signals
          </p>
        </div>

        {/* Search input & score filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-secondary-text" />
            <input
              type="text"
              placeholder="Search category, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-accent-coral"
            />
          </div>

          <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 rounded-lg border border-border text-xs text-secondary-text">
            <Filter className="w-3.5 h-3.5 text-accent-coral" />
            <select
              value={minScoreFilter}
              onChange={(e) => setMinScoreFilter(Number(e.target.value))}
              className="bg-transparent text-primary-text focus:outline-none text-xs"
            >
              <option value={0}>All Scores</option>
              <option value={70}>Score &gt;= 70</option>
              <option value={85}>Score &gt;= 85 (Hot)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Tabs Scroller */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all interactive-tap ${
              selectedFilter === tab.id
                ? 'bg-elevated text-primary-text border border-white/15 shadow-glass-subtle'
                : 'text-secondary-text hover:text-primary-text hover:bg-white/[0.03]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Highlights Grid */}
      {filtered.length === 0 ? (
        <div className="p-16 rounded-xl bg-card/60 border border-white/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-secondary-text">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-primary-text">No Highlights Found</h3>
          <p className="text-xs text-secondary-text max-w-sm mx-auto">
            Try adjusting your category or score filters, or simulate new GTA VI highlights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((h) => (
            <div
              key={h.id}
              onClick={() => onSelectHighlight(h)}
              className="rounded-xl bg-card border border-white/10 hover:border-white/20 transition-all duration-200 overflow-hidden shadow-glass-subtle hover:shadow-glass-elevated flex flex-col group cursor-pointer"
            >
              {/* Card Thumbnail */}
              <div className="relative aspect-video bg-black/40 overflow-hidden">
                {h.thumbnail_url ? (
                  <img
                    src={h.thumbnail_url}
                    alt={h.category}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-card text-secondary-text">
                    <Play className="w-8 h-8 opacity-40 group-hover:opacity-80 transition-opacity" />
                  </div>
                )}

                {/* Score badge overlay */}
                <div className="absolute top-3 left-3">
                  <ScoreBadge score={h.score} size="md" />
                </div>

                {/* Timestamp & Duration overlay */}
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white">
                  {Math.floor(h.timestamp_offset / 60)}:
                  {String(Math.floor(h.timestamp_offset % 60)).padStart(2, '0')} ({h.duration_sec.toFixed(0)}s)
                </div>

                {/* Favorite Star Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(h.id);
                  }}
                  className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md border transition-all interactive-tap ${
                    h.is_favorite
                      ? 'bg-accent-coral/20 border-accent-coral text-accent-coral shadow-coral-glow'
                      : 'bg-black/50 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${h.is_favorite ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-primary-text font-display">
                      {h.category}
                    </span>
                    <StatusBadge status={h.status} />
                  </div>

                  <p className="text-xs text-secondary-text line-clamp-2">
                    {h.reasons && h.reasons.length > 0
                      ? h.reasons.join(' • ')
                      : 'Automatic chat velocity trigger'}
                  </p>
                </div>

                {/* Card Action Controls */}
                <div
                  className="pt-3 border-t border-white/5 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onOpenClipEditor(h)}
                    className="flex-1 py-1.5 rounded-lg bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral text-xs font-medium border border-accent-coral/30 flex items-center justify-center gap-1.5 transition-all interactive-tap"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Clip &amp; Export</span>
                  </button>

                  <button
                    onClick={() => onMarkReviewed(h.id)}
                    className="p-1.5 rounded-lg text-secondary-text hover:text-status-success hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors interactive-tap"
                    title="Mark Reviewed"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteHighlight(h.id)}
                    className="p-1.5 rounded-lg text-secondary-text hover:text-status-error hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors interactive-tap"
                    title="Delete highlight"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
