import React, { useState } from 'react';
import {
  Search,
  Bell,
  Play,
  Square,
  Sparkles,
  BookmarkPlus,
  Tv,
  CheckCircle2,
} from 'lucide-react';
import { StreamStatusResponse } from '../types';

interface CommandBarProps {
  streamStatus?: StreamStatusResponse;
  onOpenSearch: () => void;
  onTriggerDemo: () => void;
  onOpenManualMarker: () => void;
  onToggleStream: () => void;
  notificationCount?: number;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  streamStatus,
  onOpenSearch,
  onTriggerDemo,
  onOpenManualMarker,
  onToggleStream,
  notificationCount = 0,
}) => {
  const isLive = streamStatus?.is_active ?? false;
  const streamTitle = streamStatus?.stream?.title || 'No active stream attached';
  const channel = streamStatus?.stream?.channel_name || 'Idle';

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-background/80 backdrop-blur-xl px-6 flex items-center justify-between">
      {/* Current Stream Status Pill */}
      <div className="flex items-center gap-3 max-w-md truncate">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 border border-white/10 shadow-glass-subtle">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-status-success animate-pulse' : 'bg-secondary-text/40'
            }`}
          />
          <Tv className="w-3.5 h-3.5 text-secondary-text" />
          <span className="text-xs font-medium text-primary-text truncate">
            {streamTitle}
          </span>
          {isLive && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-accent-coral uppercase">
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Center Quick Search Trigger */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-card/50 border border-border hover:border-white/20 text-secondary-text hover:text-primary-text transition-all w-72 text-xs interactive-tap shadow-inner"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Search highlights, clips, categories...</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-secondary-text">
          ⌘K
        </kbd>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Instant Demo Simulation Button */}
        <button
          onClick={onTriggerDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-lavender/10 border border-accent-lavender/30 text-accent-lavender hover:bg-accent-lavender/20 text-xs font-medium transition-all interactive-tap"
          title="Simulate GTA VI livestream highlight event"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simulate Event</span>
        </button>

        {/* Manual Mark Highlight Button */}
        <button
          onClick={onOpenManualMarker}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-elevated border border-border hover:border-white/20 text-primary-text text-xs font-medium transition-all interactive-tap shadow-glass-subtle"
          title="Manually mark exciting moment right now"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-accent-coral" />
          <span>Mark Highlight</span>
        </button>

        {/* Start / Stop Stream Toggle */}
        <button
          onClick={onToggleStream}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all interactive-tap ${
            isLive
              ? 'bg-status-error/15 text-status-error border border-status-error/40 hover:bg-status-error/25'
              : 'bg-accent-coral text-white border border-accent-coral/60 hover:brightness-110 shadow-coral-glow'
          }`}
        >
          {isLive ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Stream</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current" />
              <span>Attach Stream</span>
            </>
          )}
        </button>

        {/* Notifications Icon with Badge */}
        <div className="relative">
          <button className="p-2 rounded-lg text-secondary-text hover:text-primary-text hover:bg-white/5 transition-colors interactive-tap">
            <Bell className="w-4 h-4" />
          </button>
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-coral shadow-[0_0_6px_#FF795F]" />
          )}
        </div>
      </div>
    </header>
  );
};
