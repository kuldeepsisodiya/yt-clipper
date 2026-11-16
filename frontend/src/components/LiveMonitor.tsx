import React, { useState } from 'react';
import {
  Radio,
  Play,
  Square,
  Sparkles,
  BookmarkPlus,
  Volume2,
  MessageSquare,
  Activity,
  Flame,
  Clock,
  Video,
} from 'lucide-react';
import { StreamStatusResponse, Highlight } from '../types';
import { ScoreBadge } from './ScoreBadge';

interface LiveMonitorProps {
  streamStatus?: StreamStatusResponse;
  recentHighlights: Highlight[];
  onStartStream: (url: string) => void;
  onStopStream: () => void;
  onTriggerDemo: () => void;
  onManualMarker: (category: string, notes: string) => void;
  onSelectHighlight: (highlight: Highlight) => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  streamStatus,
  recentHighlights,
  onStartStream,
  onStopStream,
  onTriggerDemo,
  onManualMarker,
  onSelectHighlight,
}) => {
  const [streamInputUrl, setStreamInputUrl] = useState('');
  const [markerCategory, setMarkerCategory] = useState('Police Chase');
  const [markerNotes, setMarkerNotes] = useState('');

  const isLive = streamStatus?.is_active ?? false;
  const stream = streamStatus?.stream;
  const durationSec = streamStatus?.duration_seconds ?? 0;
  const chatRate = streamStatus?.chat_rate ?? 0;
  const baseline = streamStatus?.chat_baseline ?? 5.0;
  const audioDb = streamStatus?.audio_level ?? -32.0;

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (streamInputUrl.trim()) {
      onStartStream(streamInputUrl.trim());
      setStreamInputUrl('');
    }
  };

  const handleMarkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onManualMarker(markerCategory, markerNotes);
    setMarkerNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Stream Control & URL Input */}
      <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              isLive ? 'bg-status-success shadow-[0_0_12px_#75D6A0] animate-pulse' : 'bg-secondary-text/30'
            }`}
          />
          <div>
            <h2 className="font-display font-semibold text-primary-text text-base">
              {isLive ? stream?.title || 'Active Stream' : 'Live Stream Ingestion Engine'}
            </h2>
            <p className="text-xs text-secondary-text">
              {isLive
                ? `Ingesting: ${stream?.channel_name || 'Channel'} • Recording Buffer Active`
                : 'Enter a YouTube Livestream URL or run Demo Mode to monitor highlights'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isLive ? (
            <form onSubmit={handleStartSubmit} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="https://youtube.com/watch?v=..."
                value={streamInputUrl}
                onChange={(e) => setStreamInputUrl(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-accent-coral w-full md:w-72"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-accent-coral hover:brightness-110 text-white font-medium text-xs flex items-center gap-1.5 transition-all interactive-tap shadow-coral-glow shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Record</span>
              </button>
            </form>
          ) : (
            <button
              onClick={onStopStream}
              className="px-4 py-1.5 rounded-lg bg-status-error/15 text-status-error border border-status-error/40 hover:bg-status-error/25 text-xs font-medium flex items-center gap-1.5 transition-all interactive-tap"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Stream</span>
            </button>
          )}

          <button
            onClick={onTriggerDemo}
            className="px-3.5 py-1.5 rounded-lg bg-accent-lavender/10 hover:bg-accent-lavender/20 text-accent-lavender border border-accent-lavender/30 text-xs font-medium flex items-center gap-1.5 transition-all interactive-tap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Spike</span>
          </button>
        </div>
      </div>

      {/* Main Live Monitor Layout: Left Stream Visual + Right Telemetry Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Stream Video Player / Stage (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video rounded-xl bg-black border border-white/10 overflow-hidden shadow-glass-elevated flex items-center justify-center group">
            {isLive ? (
              <video
                src="/api/media/simulated_stream.mp4"
                controls
                autoPlay
                loop
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-card border border-white/10 flex items-center justify-center mx-auto text-secondary-text shadow-inner">
                  <Video className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-sm font-semibold text-primary-text">Stream Stage Idle</h3>
                <p className="text-xs text-secondary-text max-w-sm mx-auto">
                  Start an ingestion session or click "Simulate Spike" to generate an automated test stream.
                </p>
              </div>
            )}

            {/* Overlays on player */}
            {isLive && (
              <>
                <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white">
                  <span className="w-2 h-2 rounded-full bg-status-error animate-ping" />
                  <span>REC {formatDuration(durationSec)}</span>
                </div>

                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-accent-coral">
                  GTA VI 1080p60 H.264
                </div>
              </>
            )}
          </div>

          {/* Timeline Event Strip */}
          <div className="p-4 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary-text flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent-coral" />
                Live Detection Markers ({recentHighlights.length})
              </span>
              <span className="text-secondary-text font-mono">
                Current Offset: {formatDuration(durationSec)}
              </span>
            </div>

            {/* Timeline markers scroller */}
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {recentHighlights.length === 0 ? (
                <div className="text-xs text-secondary-text italic py-2">
                  No highlight events detected on the timeline yet...
                </div>
              ) : (
                recentHighlights.map((hl) => (
                  <button
                    key={hl.id}
                    onClick={() => onSelectHighlight(hl)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-elevated border border-white/10 hover:border-accent-coral/50 text-xs shrink-0 transition-all interactive-tap group"
                  >
                    <span className="font-mono text-[10px] text-accent-coral">
                      {Math.floor(hl.timestamp_offset / 60)}:
                      {String(Math.floor(hl.timestamp_offset % 60)).padStart(2, '0')}
                    </span>
                    <span className="font-medium text-primary-text max-w-[120px] truncate">
                      {hl.category}
                    </span>
                    <ScoreBadge score={hl.score} size="sm" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Manual Drop (1/3) */}
        <div className="space-y-4">
          {/* Real-time Velocity Meters */}
          <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-4">
            <h3 className="font-display font-semibold text-primary-text text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-coral" />
              Real-Time Signal Engine
            </h3>

            {/* Chat Velocity Gauge */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-secondary-text flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat Velocity
                </span>
                <span className="font-mono font-semibold text-primary-text">
                  {chatRate.toFixed(1)} / 10s
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-lavender to-accent-coral transition-all duration-300"
                  style={{ width: `${Math.min(100, (chatRate / 25) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-secondary-text font-mono">
                <span>Baseline: {baseline.toFixed(1)}</span>
                <span>Spike Multiplier: {(chatRate / Math.max(1, baseline)).toFixed(1)}x</span>
              </div>
            </div>

            {/* Audio RMS Decibel Meter */}
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="flex justify-between text-xs">
                <span className="text-secondary-text flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" />
                  Audio Energy
                </span>
                <span className="font-mono font-semibold text-primary-text">
                  {audioDb.toFixed(1)} dB
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    audioDb > -12
                      ? 'bg-status-error'
                      : audioDb > -20
                      ? 'bg-status-warning'
                      : 'bg-status-success'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, ((audioDb + 50) / 45) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-secondary-text font-mono">
                <span>-50 dB (Silent)</span>
                <span>-5 dB (Peak/Loud)</span>
              </div>
            </div>
          </div>

          {/* Quick Creator Manual Marker Tool */}
          <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-3">
            <h3 className="font-display font-semibold text-primary-text text-sm flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-accent-lavender" />
              Drop Creator Highlight Marker
            </h3>
            <p className="text-xs text-secondary-text">
              Manually flag a clip during stream without waiting for chat spike triggers.
            </p>

            <form onSubmit={handleMarkerSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-secondary-text font-mono block mb-1">
                  Category
                </label>
                <select
                  value={markerCategory}
                  onChange={(e) => setMarkerCategory(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-primary-text focus:outline-none focus:border-accent-coral"
                >
                  <option value="Police Chase">Police Chase</option>
                  <option value="Five-Star Wanted">Five-Star Wanted</option>
                  <option value="Shootout & Combat">Shootout & Combat</option>
                  <option value="Vehicle Crash">Vehicle Crash</option>
                  <option value="Vehicle Stunt">Vehicle Stunt</option>
                  <option value="Funny NPC Interaction">Funny NPC Interaction</option>
                  <option value="Ragdoll Physics">Ragdoll Physics</option>
                  <option value="Mission Completion">Mission Completion</option>
                  <option value="Streamer Reaction">Streamer Reaction</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-secondary-text font-mono block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. insane helicopter dive"
                  value={markerNotes}
                  onChange={(e) => setMarkerNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-accent-coral"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-accent-coral hover:brightness-110 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all interactive-tap shadow-coral-glow"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Mark 30s Highlight Now</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
