import React, { useState } from 'react';
import {
  Film,
  Play,
  Download,
  Copy,
  Trash2,
  ExternalLink,
  Check,
  Search,
  Filter,
  Type,
  Clock,
  X,
} from 'lucide-react';
import { Clip } from '../types';
import { ScoreBadge } from './ScoreBadge';

interface ClipsLibraryProps {
  clips: Clip[];
  onDeleteClip: (id: string) => void;
  onSuccessToast: (msg: string) => void;
}

export const ClipsLibrary: React.FC<ClipsLibraryProps> = ({
  clips,
  onDeleteClip,
  onSuccessToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [playingClip, setPlayingClip] = useState<Clip | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPath = (clip: Clip) => {
    const p = clip.file_path_vertical || clip.file_path_landscape || '';
    navigator.clipboard.writeText(p);
    setCopiedId(clip.id);
    onSuccessToast('File path copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredClips = clips.filter((c) => {
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
        <div>
          <h2 className="font-display font-semibold text-lg text-primary-text">Clips Library</h2>
          <p className="text-xs text-secondary-text">
            Exported 9:16 vertical shorts and landscape GTA VI highlight clips
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-secondary-text" />
            <input
              type="text"
              placeholder="Search clips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-accent-coral"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-primary-text focus:outline-none focus:border-accent-coral"
          >
            <option value="all">All Categories</option>
            <option value="Police Chase">Police Chases</option>
            <option value="Shootout & Combat">Combat</option>
            <option value="Vehicle Crash">Crashes</option>
            <option value="Funny NPC Interaction">Funny NPCs</option>
            <option value="Vehicle Stunt">Stunts</option>
          </select>
        </div>
      </div>

      {/* Grid of clips */}
      {filteredClips.length === 0 ? (
        <div className="p-16 rounded-xl bg-card/60 border border-white/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-secondary-text">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-primary-text">No Clips In Library</h3>
          <p className="text-xs text-secondary-text max-w-sm mx-auto">
            Once highlights are detected or clipped from the Clip Editor, your finished 9:16 MP4s will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClips.map((clip) => (
            <div
              key={clip.id}
              className="rounded-xl bg-card border border-white/10 overflow-hidden shadow-glass-subtle hover:border-white/20 transition-all flex flex-col group"
            >
              {/* Media Thumbnail */}
              <div
                onClick={() => setPlayingClip(clip)}
                className="relative aspect-video bg-black/40 overflow-hidden cursor-pointer"
              >
                {clip.thumbnail_url ? (
                  <img
                    src={clip.thumbnail_url}
                    alt={clip.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-card text-secondary-text">
                    <Play className="w-8 h-8 opacity-40 group-hover:opacity-80 transition-opacity" />
                  </div>
                )}

                {/* Score badge */}
                <div className="absolute top-3 left-3">
                  <ScoreBadge score={clip.score} size="sm" />
                </div>

                {/* Duration & Aspect badge */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white">
                  <span>{clip.aspect_ratio}</span>
                  <span>•</span>
                  <span>{clip.duration.toFixed(0)}s</span>
                </div>

                {/* Subtitle indicator */}
                {clip.burned_subtitles && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-accent-lavender/30 backdrop-blur-md border border-accent-lavender/50 text-[10px] font-mono text-white flex items-center gap-1">
                    <Type className="w-3 h-3" />
                    <span>CC</span>
                  </div>
                )}
              </div>

              {/* Clip Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-primary-text line-clamp-1 font-display">
                    {clip.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-secondary-text">
                    <span>{clip.category}</span>
                    <span>•</span>
                    <span className="font-mono">
                      {(clip.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => setPlayingClip(clip)}
                    className="flex-1 py-1.5 rounded-lg bg-surface-subtle hover:bg-elevated text-xs font-medium text-primary-text border border-white/10 flex items-center justify-center gap-1.5 transition-colors interactive-tap"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play</span>
                  </button>

                  <a
                    href={clip.file_path_vertical || clip.file_path_landscape || '#'}
                    download={`${clip.title}.mp4`}
                    className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors interactive-tap"
                    title="Download clip"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleCopyPath(clip)}
                    className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors interactive-tap"
                    title="Copy local file path"
                  >
                    {copiedId === clip.id ? (
                      <Check className="w-4 h-4 text-status-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteClip(clip.id)}
                    className="p-1.5 rounded-lg text-secondary-text hover:text-status-error hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors interactive-tap"
                    title="Delete clip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal Player */}
      {playingClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border border-white/15 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-semibold text-primary-text text-sm">
                  {playingClip.title}
                </h3>
                <span className="text-xs text-secondary-text font-mono">
                  {playingClip.aspect_ratio} • {playingClip.duration.toFixed(0)}s
                </span>
              </div>
              <button
                onClick={() => setPlayingClip(null)}
                className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text hover:bg-white/5 transition-colors interactive-tap"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center">
              <video
                src={playingClip.file_path_vertical || playingClip.file_path_landscape || ''}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
