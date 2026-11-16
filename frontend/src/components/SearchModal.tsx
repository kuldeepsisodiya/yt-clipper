import React, { useState, useEffect } from 'react';
import { Search, X, Flame, Film, Radio, Settings, ArrowRight } from 'lucide-react';
import { Highlight, Clip } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  clips: Clip[];
  onSelectHighlight: (h: Highlight) => void;
  onNavigateTab: (tab: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  highlights,
  clips,
  onSelectHighlight,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const matchedHighlights = highlights.filter(
    (h) =>
      h.category.toLowerCase().includes(query.toLowerCase()) ||
      h.reasons.some((r) => r.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 5);

  const matchedClips = clips.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-24 p-4">
      <div className="w-full max-w-xl bg-card border border-white/15 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-3 py-2 bg-surface-subtle rounded-xl border border-white/10">
          <Search className="w-4 h-4 text-secondary-text" />
          <input
            type="text"
            autoFocus
            placeholder="Search highlights, clips, studio views..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-primary-text placeholder:text-secondary-text focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-secondary-text">
            ESC
          </kbd>
        </div>

        {/* Quick Navigation suggestions */}
        {!query && (
          <div className="space-y-1 py-2">
            <span className="text-[10px] uppercase tracking-wider font-mono text-secondary-text px-2">
              Quick Navigation
            </span>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <button
                onClick={() => {
                  onNavigateTab('monitor');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-primary-text text-left transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-accent-coral" />
                <span>Live Monitor</span>
              </button>
              <button
                onClick={() => {
                  onNavigateTab('highlights');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-primary-text text-left transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-accent-coral" />
                <span>Highlights Explorer</span>
              </button>
              <button
                onClick={() => {
                  onNavigateTab('clips');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-primary-text text-left transition-colors"
              >
                <Film className="w-3.5 h-3.5 text-status-success" />
                <span>Clips Library</span>
              </button>
              <button
                onClick={() => {
                  onNavigateTab('settings');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-primary-text text-left transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-accent-lavender" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        )}

        {/* Search Results */}
        {query && (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {matchedHighlights.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-secondary-text px-2">
                  Highlights
                </span>
                <div className="space-y-1 mt-1">
                  {matchedHighlights.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        onSelectHighlight(h);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-xs text-left transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Flame className="w-3.5 h-3.5 text-accent-coral shrink-0" />
                        <span className="font-medium text-primary-text">{h.category}</span>
                        <span className="text-secondary-text truncate">
                          ({h.reasons[0] || 'Spike'})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-secondary-text">
                        {h.score}/100
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchedClips.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-secondary-text px-2">
                  Exported Clips
                </span>
                <div className="space-y-1 mt-1">
                  {matchedClips.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onNavigateTab('clips');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 text-xs text-left transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Film className="w-3.5 h-3.5 text-status-success shrink-0" />
                        <span className="font-medium text-primary-text">{c.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-secondary-text">
                        {c.aspect_ratio}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {matchedHighlights.length === 0 && matchedClips.length === 0 && (
              <div className="py-6 text-center text-xs text-secondary-text">
                No matching highlights or clips found for "{query}".
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
