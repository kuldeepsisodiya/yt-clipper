import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RECORDINGS_DIR = DATA_DIR / "recordings"
CLIPS_DIR = DATA_DIR / "clips"
THUMBNAILS_DIR = DATA_DIR / "thumbnails"
DB_PATH = DATA_DIR / "vice_clips.db"

# Ensure runtime directories exist
for p in [RECORDINGS_DIR, CLIPS_DIR, THUMBNAILS_DIR]:
    p.mkdir(parents=True, exist_ok=True)

class SettingsModel(BaseModel):
    # Chat Spike Detection Defaults
    chat_bucket_seconds: int = 10
    chat_baseline_window_seconds: int = 180  # 3 minutes
    chat_spike_threshold: float = 2.5       # 2.5x median
    chat_min_messages: int = 5
    chat_cooldown_seconds: int = 30

    # Highlight Scoring Weights (Total 100%)
    weight_chat_spike: float = 0.35
    weight_chat_sentiment: float = 0.20
    weight_audio_intensity: float = 0.20
    weight_speech_excitement: float = 0.15
    weight_manual_metadata: float = 0.10

    # Clipping Defaults
    clip_before_seconds: float = 20.0
    clip_after_seconds: float = 10.0
    default_aspect_ratio: str = "9:16"     # "9:16" or "16:9"
    default_crop_position: float = 0.5     # 0.0=left, 0.5=center, 1.0=right
    burn_subtitles_default: bool = False
    subtitle_style: str = "clean_white"    # "clean_white", "bold_gaming", "minimal_cinematic"
    export_preset: str = "shorts"          # "shorts", "tiktok", "reels", "landscape"

    # Audio & Whisper
    enable_audio_analysis: bool = True
    enable_whisper: bool = False

settings = SettingsModel()
