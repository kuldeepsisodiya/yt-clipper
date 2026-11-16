import React, { useState, useRef, useEffect } from 'react';
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
  AlignVerticalJustifyCenter,
  Palette,
  Check,
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

  // Video Formatting States
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [cropPosition, setCropPosition] = useState<number>(0.5); // 0.0 left, 0.5 center, 1.0 right
  const [startTrim, setStartTrim] = useState<number>(0.0);
  const [endTrim, setEndTrim] = useState<number>(0.0);
  const [selectedPreset, setSelectedPreset] = useState<'shorts' | 'tiktok' | 'reels' | 'landscape'>('shorts');
  const [isExporting, setIsExporting] = useState(false);

  // Advanced Subtitle States
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(true);
  const [customSubtitleText, setCustomSubtitleText] = useState<string>(
    highlight.speech_text || `${highlight.category.toUpperCase()} MOMENT IN VICE CITY`
  );
  const [subtitleStyle, setSubtitleStyle] = useState<'viral_pop' | 'vice_pill' | 'bold_outline' | 'minimal_cinematic'>('viral_pop');
  const [subtitlePosition, setSubtitlePosition] = useState<number>(0.75); // 0.1 to 0.9 from top
  const [highlightColor, setHighlightColor] = useState<string>('#FFE600'); // Viral Yellow, Coral, Cyan, Mint
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');

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
        subtitle_text: customSubtitleText,
        subtitle_position: subtitlePosition,
        highlight_color: highlightColor,
        font_size: fontSize,
        preset: selectedPreset,
      });
      onSuccessToast(`Clip queued with enhanced viral subtitles!`);
      setTimeout(() => {
        setIsExporting(false);
      }, 1500);
    } catch (e) {
      setIsExporting(false);
      alert('Clip export request failed. Please check media recording availability.');
    }
  };

  const videoSource = clip?.file_path_vertical || clip?.file_path_landscape || '/api/media/simulated_stream.mp4';

  // Calculate dynamic active word based on currentTime
  const words = customSubtitleText.trim().split(/\s+/);
  const activeWordIndex = words.length > 0 ? Math.floor((currentTime / Math.max(1, duration)) * words.length * 2.5) % words.length : 0;

  const fontSizes = {
    sm: 'text-sm md:text-base',
    md: 'text-base md:text-lg',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-3xl font-black',
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
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

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Video Stage Player (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-black border border-white/10 overflow-hidden shadow-glass-elevated flex items-center justify-center p-4 relative min-h-[490px]">
            {/* Aspect container */}
            <div
              className={`relative overflow-hidden rounded-xl bg-black transition-all duration-300 ${
                aspectRatio === '9:16'
                  ? 'w-[270px] h-[480px] shadow-[0_0_50px_rgba(0,0,0,0.85)] border border-white/15'
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
                  objectPosition: `${cropPosition * 100}% center`,
                }}
              />

              {/* Advanced Dynamic Subtitle Overlay */}
              {burnSubtitles && (
                <div
                  className="absolute inset-x-3 text-center pointer-events-none select-none transition-all duration-200"
                  style={{ top: `${subtitlePosition * 100}%`, transform: 'translateY(-50%)' }}
                >
                  {subtitleStyle === 'viral_pop' && (
                    <div className={`${fontSizes[fontSize]} font-display font-extrabold uppercase tracking-tight leading-snug drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]`}>
                      {words.map((word, idx) => (
                        <span
                          key={idx}
                          className={`inline-block mx-1 transition-all duration-150 ${
                            idx === activeWordIndex
                              ? 'scale-110 font-black animate-pulse'
                              : 'text-white'
                          }`}
                          style={{
                            color: idx === activeWordIndex ? highlightColor : '#FFFFFF',
                            WebkitTextStroke: '1.5px black',
                            textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.8)',
                          }}
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  )}

                  {subtitleStyle === 'vice_pill' && (
                    <div className="inline-block px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-accent-coral/40 shadow-coral-glow">
                      <span className={`${fontSizes[fontSize]} font-display font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-accent-coral via-[#FFA885] to-accent-lavender`}>
                        {customSubtitleText}
                      </span>
                    </div>
                  )}

                  {subtitleStyle === 'bold_outline' && (
                    <div
                      className={`${fontSizes[fontSize]} font-sans font-black uppercase tracking-normal text-white`}
                      style={{
                        WebkitTextStroke: '2px black',
                        textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                      }}
                    >
                      {customSubtitleText}
                    </div>
                  )}

                  {subtitleStyle === 'minimal_cinematic' && (
                    <div className="inline-block px-3 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/10">
                      <span className="font-mono text-xs md:text-sm tracking-widest text-white/95 uppercase">
                        {customSubtitleText}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Scrubber */}
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

        {/* Right: Subtitle & Video Controls (1/3) */}
        <div className="space-y-4">
          {/* Subtitle Master Inspector */}
          <div className="p-4 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-semibold text-primary-text flex items-center gap-1.5 font-display">
                <Type className="w-4 h-4 text-accent-coral" />
                Viral Subtitle Studio
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-secondary-text">
                <span>Active</span>
                <input
                  type="checkbox"
                  checked={burnSubtitles}
                  onChange={(e) => setBurnSubtitles(e.target.checked)}
                  className="w-4 h-4 accent-accent-coral rounded cursor-pointer"
                />
              </label>
            </div>

            {burnSubtitles && (
              <div className="space-y-4">
                {/* Live Caption Editor */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-secondary-text font-mono block mb-1">
                    Caption Text (Live Edit)
                  </label>
                  <textarea
                    rows={2}
                    value={customSubtitleText}
                    onChange={(e) => setCustomSubtitleText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-subtle border border-border text-xs text-primary-text focus:outline-none focus:border-accent-coral resize-none"
                    placeholder="Enter punchy caption phrase..."
                  />
                </div>

                {/* Aesthetic Styles */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-secondary-text font-mono block mb-1.5">
                    Subtitle Aesthetic
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { id: 'viral_pop', label: 'Viral Pop', desc: 'CapCut / Shorts' },
                      { id: 'vice_pill', label: 'Vice Pill', desc: 'Neon Glow' },
                      { id: 'bold_outline', label: 'Bold Outline', desc: 'Gaming Stroke' },
                      { id: 'minimal_cinematic', label: 'Cinematic', desc: 'Clean Minimal' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setSubtitleStyle(st.id as any)}
                        className={`p-2 rounded-lg border text-left transition-all interactive-tap ${
                          subtitleStyle === st.id
                            ? 'border-accent-coral bg-accent-coral/10 text-primary-text shadow-coral-glow'
                            : 'border-white/5 text-secondary-text hover:text-primary-text'
                        }`}
                      >
                        <div className="font-semibold text-[11px] text-primary-text">{st.label}</div>
                        <div className="text-[9px] text-secondary-text">{st.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Highlight Color Picker */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-secondary-text font-mono block mb-1.5 flex items-center gap-1">
                    <Palette className="w-3 h-3 text-accent-lavender" />
                    Word Highlight Color
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { color: '#FFE600', name: 'Viral Yellow' },
                      { color: '#FF795F', name: 'Vice Coral' },
                      { color: '#00F0FF', name: 'Cyber Cyan' },
                      { color: '#75D6A0', name: 'Neon Mint' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        onClick={() => setHighlightColor(c.color)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 interactive-tap border border-white/20"
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      >
                        {highlightColor === c.color && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position Slider & Presets */}
                <div>
                  <div className="flex justify-between text-[11px] text-secondary-text font-mono mb-1">
                    <span>Vertical Position</span>
                    <span>{Math.round(subtitlePosition * 100)}% Height</span>
                  </div>
                  <input
                    type="range"
                    min="0.15"
                    max="0.85"
                    step="0.05"
                    value={subtitlePosition}
                    onChange={(e) => setSubtitlePosition(parseFloat(e.target.value))}
                    className="w-full accent-accent-coral h-1.5 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {[
                      { pos: 0.18, label: 'Top' },
                      { pos: 0.50, label: 'Center' },
                      { pos: 0.75, label: 'Bottom' },
                    ].map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setSubtitlePosition(p.pos)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all ${
                          Math.abs(subtitlePosition - p.pos) < 0.05
                            ? 'bg-elevated border-accent-coral text-primary-text'
                            : 'border-white/5 text-secondary-text hover:text-primary-text'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-secondary-text font-mono block mb-1">
                    Font Size
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setFontSize(s)}
                        className={`py-1 rounded text-[11px] font-mono uppercase border transition-all ${
                          fontSize === s
                            ? 'bg-elevated border-accent-lavender text-primary-text font-bold'
                            : 'border-white/5 text-secondary-text hover:text-primary-text'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Platform Preset & 9:16 Crop */}
          <div className="p-4 rounded-xl bg-card/90 border border-white/10 shadow-glass-subtle space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-secondary-text">
              Platform Framing
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setSelectedPreset('shorts');
                  setAspectRatio('9:16');
                }}
                className={`p-2 rounded-lg border text-xs text-left transition-all interactive-tap ${
                  selectedPreset === 'shorts'
                    ? 'border-accent-coral bg-accent-coral/10 text-primary-text font-semibold'
                    : 'border-border text-secondary-text hover:text-primary-text'
                }`}
              >
                <div className="font-medium text-primary-text">YT Shorts / Reels</div>
                <div className="text-[10px] text-secondary-text font-mono">1080x1920 (9:16)</div>
              </button>

              <button
                onClick={() => {
                  setSelectedPreset('landscape');
                  setAspectRatio('16:9');
                }}
                className={`p-2 rounded-lg border text-xs text-left transition-all interactive-tap ${
                  selectedPreset === 'landscape'
                    ? 'border-accent-coral bg-accent-coral/10 text-primary-text font-semibold'
                    : 'border-border text-secondary-text hover:text-primary-text'
                }`}
              >
                <div className="font-medium text-primary-text">Landscape</div>
                <div className="text-[10px] text-secondary-text font-mono">1920x1080 (16:9)</div>
              </button>
            </div>

            {aspectRatio === '9:16' && (
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-[11px] text-secondary-text font-mono">
                  <span>Horizontal Crop Tracking</span>
                  <span>{cropPosition === 0.5 ? 'Center (0.5)' : cropPosition < 0.5 ? 'Left bias' : 'Right bias'}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={cropPosition}
                  onChange={(e) => setCropPosition(parseFloat(e.target.value))}
                  className="w-full accent-accent-coral h-1.5 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
