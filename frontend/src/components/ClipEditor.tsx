import React, { useState, useRef } from 'react';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Type,
  Maximize,
  Sliders,
  Sparkles,
  Share2,
  Download,
  ArrowLeft,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { Highlight, Clip } from '../types';
import { editClip } from '../services/api';

interface ClipEditorProps {
  highlight: Highlight;
  clip?: Clip;
  onBack: () => void;
  onSuccessToast: (msg: string) => void;
}

export const ClipEditor: React.FC<ClipEditorProps> = ({
  highlight,
  clip,
  onBack,
  onSuccessToast,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(highlight.duration_sec || 30);

  // Editor states
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [cropPosition, setCropPosition] = useState<number>(0.5); // 0.0 left, 0.5 center, 1.0 right
  const [startTrim, setStartTrim] = useState<number>(0.0);
  const [endTrim, setEndTrim] = useState<number>(0.0);
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(true);
  const [subtitleStyle, setSubtitleStyle] = useState<'clean_white' | 'bold_gaming' | 'minimal_cinematic'>('clean_white');
  const [selectedPreset, setSelectedPreset] = useState<'shorts' | 'tiktok' | 'reels' | 'landscape'>('shorts');
  const [isExporting, setIsExporting] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const targetClipId = clip?.id || `clip_${highlight.id}`;
      await editClip(targetClipId, {
        start_trim: startTrim,
        end_trim: endTrim,
        crop_position: cropPosition,
        aspect_ratio: aspectRatio,
        burn_subtitles: burnSubtitles,
        subtitle_style: subtitleStyle,
        preset: selectedPreset,
      });
      onSuccessToast(`Clip queued for 1080x1920 export!`);
      setTimeout(() => {
        setIsExporting(false);
      }, 1500);
    } catch (e) {
      setIsExporting(false);
      alert('Clip export request failed. Please ensure stream buffer is available.');
    }
  };

  const videoSource = clip?.file_path_vertical || clip?.file_path_landscape || '/api/media/simulated_stream.mp4';

  return (
    <div className="space-y-6">
      {/* Top Bar with Back and Export Button */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-secondary-text hover:text-primary-text transition-colors interactive-tap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Studio</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-secondary-text">
            {highlight.category} • Score: {highlight.score}/100
          </span>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg bg-accent-coral hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all interactive-tap shadow-coral-glow"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Encoding Clip...' : 'Export Final Clip'}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video Preview Player (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-black border border-white/10 overflow-hidden shadow-glass-elevated flex items-center justify-center p-4 relative min-h-[460px]">
            {/* Aspect container */}
            <div
              className={`relative overflow-hidden rounded-lg bg-black transition-all duration-300 ${
                aspectRatio === '9:16'
                  ? 'w-[260px] h-[460px] shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10'
                  : 'w-full aspect-video'
              }`}
            >
              <video
                ref={videoRef}
                src={videoSource}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={() => {
                  if (videoRef.current) setDuration(videoRef.current.duration || 30);
                }}
                className="w-full h-full object-cover"
                style={{
                  // Simulate dynamic crop offset preview for 9:16
                  objectPosition: `${cropPosition * 100}% center`,
                }}
              />

              {/* Live Subtitle Overlay Preview */}
              {burnSubtitles && (
                <div className="absolute bottom-10 inset-x-4 text-center pointer-events-none">
                  {subtitleStyle === 'clean_white' && (
                    <span className="bg-black/70 text-white font-sans font-medium text-xs px-2.5 py-1 rounded shadow-md backdrop-blur-sm">
                      {highlight.speech_text || 'GTA VI: Vice City Action'}
                    </span>
                  )}
                  {subtitleStyle === 'bold_gaming' && (
                    <span className="bg-accent-coral text-white font-display font-extrabold text-xs uppercase px-2.5 py-1 rounded tracking-wider shadow-lg">
                      {highlight.speech_text || 'GTA VI: VICE CITY ACTION'}
                    </span>
                  )}
                  {subtitleStyle === 'minimal_cinematic' && (
                    <span className="text-white/90 font-mono tracking-widest text-[11px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {highlight.speech_text || 'VICE CITY MOMENT'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scrubber & Trimmer Timeline */}
          <div className="p-4 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg bg-elevated hover:bg-white/10 text-primary-text transition-colors interactive-tap"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg text-secondary-text hover:text-primary-text transition-colors interactive-tap"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="font-mono text-secondary-text text-[11px]">
                  {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-secondary-text font-mono">
                <span>Start Trim: -{startTrim.toFixed(1)}s</span>
                <span>•</span>
                <span>End Trim: +{endTrim.toFixed(1)}s</span>
              </div>
            </div>

            {/* Custom Interactive Scrubber Range */}
            <input
              type="range"
              min="0"
              max={duration || 30}
              step="0.1"
              value={currentTime}
              onChange={(e) => {
                const t = parseFloat(e.target.value);
                setCurrentTime(t);
                if (videoRef.current) videoRef.current.currentTime = t;
              }}
              className="w-full accent-accent-coral h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Controls & Presets (1/3) */}
        <div className="space-y-4">
          {/* Preset Picker */}
          <div className="p-4 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-secondary-text">
              Platform Preset
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSelectedPreset('shorts');
                  setAspectRatio('9:16');
                }}
                className={`p-2.5 rounded-lg border text-xs text-left transition-all interactive-tap ${
                  selectedPreset === 'shorts'
                    ? 'border-accent-coral bg-accent-coral/10 text-primary-text font-semibold shadow-coral-glow'
                    : 'border-border text-secondary-text hover:text-primary-text'
                }`}
              >
                <div className="font-medium text-primary-text">YT Shorts</div>
                <div className="text-[10px] text-secondary-text font-mono">1080x1920 (9:16)</div>
              </button>

              <button
                onClick={() => {
                  setSelectedPreset('tiktok');
                  setAspectRatio('9:16');
                }}
                className={`p-2.5 rounded-lg border text-xs text-left transition-all interactive-tap ${
                  selectedPreset === 'tiktok'
                    ? 'border-accent-coral bg-accent-coral/10 text-primary-text font-semibold shadow-coral-glow'
                    : 'border-border text-secondary-text hover:text-primary-text'
                }`}
              >
                <div className="font-medium text-primary-text">TikTok</div>
                <div className="text-[10px] text-secondary-text font-mono">1080x1920 (9:16)</div>
              </button>

              <button
                onClick={() => {
                  setSelectedPreset('reels');
                  setAspectRatio('9:16');
                }}
                className={`p-2.5 rounded-lg border text-xs text-left transition-all interactive-tap ${
                  selectedPreset === 'reels'
                    ? 'border-accent-coral bg-accent-coral/10 text-primary-text font-semibold shadow-coral-glow'
                    : 'border-border text-secondary-text hover:text-primary-text'
                }`}
              >
                <div className="font-medium text-primary-text">IG Reels</div>
                <div className="text-[10px] text-secondary-text font-mono">1080x1920 (9:16)</div>
              </button>

              <button
                onClick={() => {
                  setSelectedPreset('landscape');
                  setAspectRatio('16:9');
                }}
                className={`p-2.5 rounded-lg border text-xs text-left transition-all interactive-tap ${
                  selectedPreset === 'landscape'
                    ? 'border-accent-coral bg-accent-coral/10 text-primary-text font-semibold shadow-coral-glow'
                    : 'border-border text-secondary-text hover:text-primary-text'
                }`}
              >
                <div className="font-medium text-primary-text">Landscape</div>
                <div className="text-[10px] text-secondary-text font-mono">1920x1080 (16:9)</div>
              </button>
            </div>
          </div>

          {/* Intelligent Crop Positioning */}
          {aspectRatio === '9:16' && (
            <div className="p-4 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary-text flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-accent-coral" />
                  Intelligent Crop Framing
                </span>
                <span className="font-mono text-secondary-text">
                  {cropPosition === 0.5 ? 'Center (0.5)' : cropPosition < 0.5 ? 'Left bias' : 'Right bias'}
                </span>
              </div>
              <p className="text-[11px] text-secondary-text">
                Slide horizontally to track gameplay action or streamer facecam for 9:16 portrait export.
              </p>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={cropPosition}
                onChange={(e) => setCropPosition(parseFloat(e.target.value))}
                className="w-full accent-accent-coral h-1.5 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-secondary-text font-mono">
                <span>Left (0.0)</span>
                <span>Center (0.5)</span>
                <span>Right (1.0)</span>
              </div>
            </div>
          )}

          {/* Subtitles & Styling */}
          <div className="p-4 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary-text flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-accent-lavender" />
                Burn Subtitles
              </span>
              <input
                type="checkbox"
                checked={burnSubtitles}
                onChange={(e) => setBurnSubtitles(e.target.checked)}
                className="w-4 h-4 accent-accent-coral rounded cursor-pointer"
              />
            </div>

            {burnSubtitles && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-[11px] uppercase tracking-wider text-secondary-text font-mono block">
                  Subtitle Aesthetic
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(['clean_white', 'bold_gaming', 'minimal_cinematic'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setSubtitleStyle(style)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-left capitalize transition-all interactive-tap border ${
                        subtitleStyle === style
                          ? 'border-accent-lavender bg-accent-lavender/10 text-primary-text'
                          : 'border-white/5 text-secondary-text hover:text-primary-text'
                      }`}
                    >
                      {style.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
