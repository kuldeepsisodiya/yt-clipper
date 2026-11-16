import React, { useState } from 'react';
import {
  TrendingUp,
  Activity,
  Film,
  Zap,
  Clock,
  ArrowUpRight,
  Play,
  Scissors,
  CheckCircle,
  ExternalLink,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { Highlight, AnalyticsData } from '../types';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';

interface OverviewProps {
  analytics?: AnalyticsData;
  highlights: Highlight[];
  onSelectHighlight: (highlight: Highlight) => void;
  onOpenClipEditor: (highlight: Highlight) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  analytics,
  highlights,
  onSelectHighlight,
  onOpenClipEditor,
}) => {
  const [timelineFilter, setTimelineFilter] = useState<'15m' | '1h' | 'all'>('all');

  const totalHighlights = analytics?.total_highlights ?? highlights.length;
  const clipsGenerated = analytics?.clips_generated ?? 0;
  const avgScore = analytics?.average_score ?? 0;
  const peakChat = analytics?.peak_chat_rate ?? 0;

  // Format activity timeline for chart
  const timelineData = (analytics?.activity_timeline || []).map((pt) => ({
    time: `${Math.floor(pt.timestamp_offset / 60)}m ${Math.floor(pt.timestamp_offset % 60)}s`,
    chatRate: pt.chat_rate,
    audioLevel: Math.max(0, pt.audio_level + 45), // normalize dB for visual line
    hasHighlight: pt.has_highlight ? 25 : 0,
    score: pt.highlight_score,
  }));

  // Format categories for horizontal bar chart
  const categoryData = Object.entries(analytics?.categories_distribution || {}).map(
    ([name, count]) => ({
      name,
      count,
    })
  );

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Hero KPI: Total Highlights */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-coral/5 rounded-full blur-2xl group-hover:bg-accent-coral/10 transition-all" />
          <div className="flex items-center justify-between text-secondary-text mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Total Highlights</span>
            <Flame className="w-4 h-4 text-accent-coral" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tracking-tight text-primary-text">
              {totalHighlights}
            </span>
            <span className="inline-flex items-center text-xs font-medium text-status-success">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              +14% vs prev
            </span>
          </div>
          <p className="text-xs text-secondary-text mt-2">
            Detected via chat velocity & multi-signal fusion
          </p>
        </div>

        {/* Peak Chat Activity */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <div className="flex items-center justify-between text-secondary-text mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Peak Chat Velocity</span>
            <Zap className="w-4 h-4 text-accent-lavender" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tracking-tight text-primary-text">
              {peakChat.toFixed(1)}
            </span>
            <span className="text-xs text-secondary-text font-mono">msg/10s</span>
          </div>
          <p className="text-xs text-secondary-text mt-2">
            Baseline: ~5.0 msg/10s ({(peakChat / 5.0).toFixed(1)}x surge)
          </p>
        </div>

        {/* Clips Generated */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <div className="flex items-center justify-between text-secondary-text mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Clips Generated</span>
            <Film className="w-4 h-4 text-status-success" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tracking-tight text-primary-text">
              {clipsGenerated}
            </span>
            <span className="text-xs text-status-success font-medium">
              100% ready
            </span>
          </div>
          <p className="text-xs text-secondary-text mt-2">
            Exported in 9:16 vertical & 16:9 H.264 MP4
          </p>
        </div>

        {/* Average Highlight Score */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <div className="flex items-center justify-between text-secondary-text mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Average Score</span>
            <Activity className="w-4 h-4 text-accent-coral" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold tracking-tight text-primary-text">
              {avgScore}
            </span>
            <span className="text-xs text-secondary-text font-mono">/ 100</span>
          </div>
          <p className="text-xs text-secondary-text mt-2">
            Weighted multi-factor confidence rating
          </p>
        </div>
      </div>

      {/* Charts Section: 2/3 Main Chart + 1/3 Categories Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Stream Activity (2/3) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-primary-text">Stream Activity</h3>
              <p className="text-xs text-secondary-text">
                Live velocity, audio dB surge, and detection trigger markers
              </p>
            </div>
            <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-lg border border-white/5 text-xs">
              {(['15m', '1h', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimelineFilter(filter)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-all interactive-tap ${
                    timelineFilter === filter
                      ? 'bg-elevated text-primary-text font-medium shadow-sm'
                      : 'text-secondary-text hover:text-primary-text'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" stroke="#9699A2" fontSize={10} tickLine={false} />
                  <YAxis stroke="#9699A2" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#191B20',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="chatRate"
                    name="Chat Velocity (msg/10s)"
                    stroke="#FF795F"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="audioLevel"
                    name="Audio Energy"
                    stroke="#A99AEF"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="step"
                    dataKey="hasHighlight"
                    name="Highlight Spike Trigger"
                    stroke="#75D6A0"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#75D6A0' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-secondary-text">
                Waiting for stream pulse data...
              </div>
            )}
          </div>
        </div>

        {/* Secondary Chart: Highlight Categories (1/3) */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold text-primary-text">Highlight Categories</h3>
            <p className="text-xs text-secondary-text">Classified GTA VI content moments</p>
          </div>

          <div className="h-64 w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="#9699A2" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#9699A2" fontSize={10} width={100} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#191B20',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#FF795F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-secondary-text">
                No events categorized yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Highlights Table */}
      <div className="rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-primary-text">Recent Stream Highlights</h3>
            <p className="text-xs text-secondary-text">
              Review, trim, and publish high-scoring moments as vertical clips
            </p>
          </div>
          <span className="text-xs font-mono text-secondary-text">
            {highlights.length} detected moments
          </span>
        </div>

        {highlights.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-secondary-text">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-primary-text">No highlights detected yet</p>
            <p className="text-xs text-secondary-text max-w-sm mx-auto">
              Attach a YouTube livestream in Live Monitor or click "Simulate Event" above to test highlight detection.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle/60 text-secondary-text uppercase font-mono text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Detection Reason</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {highlights.slice(0, 8).map((h) => (
                  <tr
                    key={h.id}
                    onClick={() => onSelectHighlight(h)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    {/* Thumbnail preview */}
                    <td className="py-3 px-4">
                      <div className="w-16 h-10 rounded bg-elevated border border-white/10 overflow-hidden relative group-hover:border-accent-coral/50 transition-colors">
                        {h.thumbnail_url ? (
                          <img src={h.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-card text-secondary-text">
                            <Play className="w-3 h-3 opacity-60" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-secondary-text">
                      {Math.floor(h.timestamp_offset / 60)}:
                      {String(Math.floor(h.timestamp_offset % 60)).padStart(2, '0')}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 font-medium text-primary-text">
                      {h.category}
                    </td>

                    {/* Detection Reason */}
                    <td className="py-3 px-4 text-secondary-text max-w-xs truncate">
                      {h.reasons && h.reasons.length > 0 ? h.reasons[0] : 'Chat velocity surge'}
                    </td>

                    {/* Score */}
                    <td className="py-3 px-4">
                      <ScoreBadge score={h.score} size="sm" />
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 font-mono text-secondary-text">
                      {h.duration_sec.toFixed(0)}s
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={h.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenClipEditor(h)}
                          className="px-2 py-1 rounded bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral text-[11px] font-medium border border-accent-coral/30 flex items-center gap-1 transition-all interactive-tap"
                          title="Open in Clip Editor"
                        >
                          <Scissors className="w-3 h-3" />
                          <span>Edit Clip</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
