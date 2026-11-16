export type GTAEventCategory =
  | 'Police Chase'
  | 'Five-Star Wanted'
  | 'Shootout & Combat'
  | 'Vehicle Crash'
  | 'Vehicle Theft & Escape'
  | 'Explosion'
  | 'Funny NPC Interaction'
  | 'Unexpected Glitch'
  | 'Ragdoll Physics'
  | 'Rare Encounter'
  | 'Mission Completion'
  | 'Unexpected Story Moment'
  | 'Vehicle Stunt'
  | 'High-Speed Driving'
  | 'Streamer Reaction'
  | 'Manual Creator Marker'
  | 'Other';

export type ProcessingStatus = 'Detected' | 'Processing' | 'Ready' | 'Failed' | 'Reviewed';

export interface Highlight {
  id: string;
  stream_id: string;
  timestamp_offset: number;
  absolute_timestamp: string;
  category: GTAEventCategory;
  score: number;
  reasons: string[];
  chat_rate: number;
  audio_level: number;
  speech_text?: string;
  platform?: 'youtube' | 'kick';
  duration_sec: number;
  detection_type: 'detected' | 'inferred' | 'manual';
  status: ProcessingStatus;
  is_favorite: boolean;
  clip_id?: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface Clip {
  id: string;
  highlight_id: string;
  stream_id: string;
  title: string;
  file_path_landscape?: string;
  file_path_vertical?: string;
  thumbnail_url?: string;
  srt_url?: string;
  duration: number;
  aspect_ratio: string;
  crop_position: number;
  subtitle_style: 'viral_pop' | 'vice_pill' | 'bold_outline' | 'minimal_cinematic' | string;
  subtitle_position?: number;
  highlight_color?: string;
  burned_subtitles: boolean;
  file_size_bytes: number;
  status: ProcessingStatus;
  created_at: string;
  score: number;
  category: GTAEventCategory;
}

export interface StreamData {
  id: string;
  youtube_url: string;
  title: string;
  channel_name: string;
  thumbnail_url?: string;
  platform?: 'youtube' | 'kick';
  status: 'idle' | 'recording' | 'simulating' | 'stopped';
  started_at?: string;
}

export interface StreamStatusResponse {
  is_active: boolean;
  stream?: StreamData;
  duration_seconds: number;
  chat_rate: number;
  chat_baseline: number;
  audio_level: number;
}

export interface ActivityPoint {
  timestamp_offset: number;
  chat_rate: number;
  audio_level: number;
  baseline: number;
  has_highlight: boolean;
  highlight_category?: string;
  highlight_score?: number;
}

export interface AnalyticsData {
  total_highlights: number;
  clips_generated: number;
  average_score: number;
  peak_chat_rate: number;
  baseline_chat_rate: number;
  clip_success_rate: number;
  categories_distribution: Record<string, number>;
  activity_timeline: ActivityPoint[];
}

export interface AppSettings {
  chat_bucket_seconds: number;
  chat_baseline_window_seconds: number;
  chat_spike_threshold: number;
  chat_min_messages: number;
  chat_cooldown_seconds: number;
  weight_chat_spike: number;
  weight_chat_sentiment: number;
  weight_audio_intensity: number;
  weight_speech_excitement: number;
  weight_manual_metadata: number;
  clip_before_seconds: number;
  clip_after_seconds: number;
  default_aspect_ratio: string;
  default_crop_position: number;
  burn_subtitles_default: boolean;
  subtitle_style: string;
  export_preset: string;
  enable_audio_analysis: boolean;
  enable_whisper: boolean;
}
