import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Sliders, CheckCircle2 } from 'lucide-react';
import { AppSettings } from '../types';
import { fetchSettings, updateSettings } from '../services/api';

interface SettingsModalProps {
  onSuccessToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onSuccessToast }) => {
  const [config, setConfig] = useState<AppSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings().then(setConfig).catch(console.error);
  }, []);

  if (!config) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(config);
      onSuccessToast('Settings saved successfully!');
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      chat_bucket_seconds: 10,
      chat_baseline_window_seconds: 180,
      chat_spike_threshold: 2.5,
      chat_min_messages: 5,
      chat_cooldown_seconds: 30,
      weight_chat_spike: 0.35,
      weight_chat_sentiment: 0.20,
      weight_audio_intensity: 0.20,
      weight_speech_excitement: 0.15,
      weight_manual_metadata: 0.10,
      clip_before_seconds: 20.0,
      clip_after_seconds: 10.0,
      default_aspect_ratio: '9:16',
      default_crop_position: 0.5,
      burn_subtitles_default: false,
      subtitle_style: 'clean_white',
      export_preset: 'shorts',
      enable_audio_analysis: true,
      enable_whisper: false,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg text-primary-text">
            Studio Engine Configuration
          </h2>
          <p className="text-xs text-secondary-text">
            Fine-tune GTA VI highlight thresholds, scoring weights, and FFmpeg clipping rules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg border border-border text-xs text-secondary-text hover:text-primary-text transition-colors interactive-tap"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-accent-coral hover:brightness-110 text-white font-semibold text-xs flex items-center gap-1.5 transition-all interactive-tap shadow-coral-glow"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Chat Spike Detection */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-4">
          <h3 className="font-display font-semibold text-primary-text text-sm">
            Chat Spike Detection Rules
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Bucket Duration</span>
                <span className="font-mono text-primary-text">{config.chat_bucket_seconds}s</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={config.chat_bucket_seconds}
                onChange={(e) => setConfig({ ...config, chat_bucket_seconds: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Rolling Baseline Window</span>
                <span className="font-mono text-primary-text">{config.chat_baseline_window_seconds}s (3 min)</span>
              </div>
              <input
                type="range"
                min="60"
                max="600"
                step="30"
                value={config.chat_baseline_window_seconds}
                onChange={(e) => setConfig({ ...config, chat_baseline_window_seconds: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Spike Multiplier Threshold</span>
                <span className="font-mono text-primary-text">{config.chat_spike_threshold}x</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="5.0"
                step="0.1"
                value={config.chat_spike_threshold}
                onChange={(e) => setConfig({ ...config, chat_spike_threshold: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Minimum Messages Required</span>
                <span className="font-mono text-primary-text">{config.chat_min_messages}</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={config.chat_min_messages}
                onChange={(e) => setConfig({ ...config, chat_min_messages: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Spike Trigger Cooldown</span>
                <span className="font-mono text-primary-text">{config.chat_cooldown_seconds}s</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={config.chat_cooldown_seconds}
                onChange={(e) => setConfig({ ...config, chat_cooldown_seconds: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Highlight Scoring Weights */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-4">
          <h3 className="font-display font-semibold text-primary-text text-sm">
            Multi-Signal Scoring Weights
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Chat Velocity Spike</span>
                <span className="font-mono text-primary-text">{Math.round(config.weight_chat_spike * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.60"
                step="0.05"
                value={config.weight_chat_spike}
                onChange={(e) => setConfig({ ...config, weight_chat_spike: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Reaction Sentiment (LOL, WTF)</span>
                <span className="font-mono text-primary-text">{Math.round(config.weight_chat_sentiment * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.40"
                step="0.05"
                value={config.weight_chat_sentiment}
                onChange={(e) => setConfig({ ...config, weight_chat_sentiment: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Audio Volume Intensity</span>
                <span className="font-mono text-primary-text">{Math.round(config.weight_audio_intensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.40"
                step="0.05"
                value={config.weight_audio_intensity}
                onChange={(e) => setConfig({ ...config, weight_audio_intensity: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Speech Excitement</span>
                <span className="font-mono text-primary-text">{Math.round(config.weight_speech_excitement * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.05"
                value={config.weight_speech_excitement}
                onChange={(e) => setConfig({ ...config, weight_speech_excitement: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-secondary-text">Manual Creator Marker Bonus</span>
                <span className="font-mono text-primary-text">{Math.round(config.weight_manual_metadata * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.05"
                value={config.weight_manual_metadata}
                onChange={(e) => setConfig({ ...config, weight_manual_metadata: Number(e.target.value) })}
                className="w-full accent-accent-coral h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Clipping Defaults */}
        <div className="p-5 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-4 md:col-span-2">
          <h3 className="font-display font-semibold text-primary-text text-sm">
            Video Processing &amp; Subtitle Defaults
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-secondary-text block mb-1">Pre-Event Capture Duration</label>
              <input
                type="number"
                value={config.clip_before_seconds}
                onChange={(e) => setConfig({ ...config, clip_before_seconds: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-primary-text"
              />
              <span className="text-[10px] text-secondary-text mt-1 block">Default: 20 seconds before</span>
            </div>

            <div>
              <label className="text-secondary-text block mb-1">Post-Event Capture Duration</label>
              <input
                type="number"
                value={config.clip_after_seconds}
                onChange={(e) => setConfig({ ...config, clip_after_seconds: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-primary-text"
              />
              <span className="text-[10px] text-secondary-text mt-1 block">Default: 10 seconds after</span>
            </div>

            <div>
              <label className="text-secondary-text block mb-1">Default Aspect Ratio</label>
              <select
                value={config.default_aspect_ratio}
                onChange={(e) => setConfig({ ...config, default_aspect_ratio: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-surface-subtle border border-border text-primary-text"
              >
                <option value="9:16">9:16 Vertical (Shorts/TikTok/Reels)</option>
                <option value="16:9">16:9 Landscape</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
