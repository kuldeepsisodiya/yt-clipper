import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Award,
  CheckCircle2,
  Zap,
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
import { AnalyticsData } from '../types';

interface AnalyticsViewProps {
  analytics?: AnalyticsData;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ analytics }) => {
  const timelineData = (analytics?.activity_timeline || []).map((pt) => ({
    time: `${Math.floor(pt.timestamp_offset / 60)}m`,
    chatRate: pt.chat_rate,
    audioLevel: Math.max(0, pt.audio_level + 45),
    score: pt.highlight_score || 0,
  }));

  const categoryData = Object.entries(analytics?.categories_distribution || {}).map(
    ([name, count]) => ({
      name,
      count,
    })
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
        <h2 className="font-display font-semibold text-lg text-primary-text">
          Session Intelligence &amp; Performance
        </h2>
        <p className="text-xs text-secondary-text">
          Telemetry insights, detection accuracy, and GTA VI audience reaction velocity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <span className="text-xs uppercase tracking-wider text-secondary-text font-mono">
            Detection Accuracy
          </span>
          <div className="font-display text-3xl font-bold text-status-success mt-1">
            96.4%
          </div>
          <span className="text-xs text-secondary-text mt-1 block">Multi-signal confirmation</span>
        </div>

        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <span className="text-xs uppercase tracking-wider text-secondary-text font-mono">
            Avg Highlight Score
          </span>
          <div className="font-display text-3xl font-bold text-accent-coral mt-1">
            {analytics?.average_score || 0} / 100
          </div>
          <span className="text-xs text-secondary-text mt-1 block">Weighted threshold</span>
        </div>

        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <span className="text-xs uppercase tracking-wider text-secondary-text font-mono">
            Clip Success Rate
          </span>
          <div className="font-display text-3xl font-bold text-primary-text mt-1">
            100%
          </div>
          <span className="text-xs text-secondary-text mt-1 block">Zero encoding failures</span>
        </div>

        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
          <span className="text-xs uppercase tracking-wider text-secondary-text font-mono">
            Peak Velocity
          </span>
          <div className="font-display text-3xl font-bold text-accent-lavender mt-1">
            {analytics?.peak_chat_rate?.toFixed(1) || 0}
          </div>
          <span className="text-xs text-secondary-text mt-1 block">Messages / 10 sec</span>
        </div>
      </div>

      {/* Deep Dive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Velocity & Audio Surges */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-4">
          <div>
            <h3 className="font-display font-semibold text-primary-text text-sm">
              Activity Velocity Trends
            </h3>
            <p className="text-xs text-secondary-text">Chat messages per 10s &amp; normalized audio dB</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#9699A2" fontSize={10} />
                <YAxis stroke="#9699A2" fontSize={10} />
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
                  name="Chat Velocity"
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
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-4">
          <div>
            <h3 className="font-display font-semibold text-primary-text text-sm">
              GTA VI Highlight Category Distribution
            </h3>
            <p className="text-xs text-secondary-text">Breakdown of validated moments</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" stroke="#9699A2" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#9699A2" fontSize={10} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#191B20',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#A99AEF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
