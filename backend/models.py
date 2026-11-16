from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class GTAEventCategory(str, Enum):
    POLICE_CHASE = "Police Chase"
    FIVE_STAR_WANTED = "Five-Star Wanted"
    SHOOTOUT_COMBAT = "Shootout & Combat"
    VEHICLE_CRASH = "Vehicle Crash"
    VEHICLE_THEFT_ESCAPE = "Vehicle Theft & Escape"
    EXPLOSION = "Explosion"
    FUNNY_NPC = "Funny NPC Interaction"
    UNEXPECTED_GLITCH = "Unexpected Glitch"
    RAGDOLL_PHYSICS = "Ragdoll Physics"
    RARE_ENCOUNTER = "Rare Encounter"
    MISSION_COMPLETION = "Mission Completion"
    STORY_MOMENT = "Unexpected Story Moment"
    VEHICLE_STUNT = "Vehicle Stunt"
    HIGH_SPEED_DRIVING = "High-Speed Driving"
    STREAMER_REACTION = "Streamer Reaction"
    MANUAL_MARKER = "Manual Creator Marker"
    OTHER = "Other"

class StreamStatus(str, Enum):
    IDLE = "idle"
    RECORDING = "recording"
    SIMULATING = "simulating"
    STOPPED = "stopped"
    ERROR = "error"

class ProcessingStatus(str, Enum):
    DETECTED = "Detected"
    PROCESSING = "Processing"
    READY = "Ready"
    FAILED = "Failed"
    REVIEWED = "Reviewed"

class SubtitleStyle(str, Enum):
    CLEAN_WHITE = "clean_white"
    BOLD_GAMING = "bold_gaming"
    MINIMAL_CINEMATIC = "minimal_cinematic"

class HighlightBase(BaseModel):
    category: GTAEventCategory
    score: int = Field(ge=0, le=100)
    reasons: List[str]
    chat_rate: float = 0.0
    audio_level: float = 0.0
    speech_text: Optional[str] = None
    duration_sec: float = 30.0
    detection_type: str = "detected"  # "detected", "inferred", "manual"

class HighlightCreate(HighlightBase):
    stream_id: str
    timestamp_offset: float
    absolute_timestamp: Optional[str] = None

class ManualMarkerRequest(BaseModel):
    category: GTAEventCategory = GTAEventCategory.MANUAL_MARKER
    notes: Optional[str] = None
    duration_sec: float = 30.0

class HighlightResponse(HighlightBase):
    id: str
    stream_id: str
    timestamp_offset: float
    absolute_timestamp: str
    status: ProcessingStatus
    is_favorite: bool
    clip_id: Optional[str]
    thumbnail_url: Optional[str]
    created_at: str

class ClipResponse(BaseModel):
    id: str
    highlight_id: str
    stream_id: str
    title: str
    file_path_landscape: Optional[str]
    file_path_vertical: Optional[str]
    thumbnail_url: Optional[str]
    srt_url: Optional[str]
    duration: float
    aspect_ratio: str
    crop_position: float
    subtitle_style: str
    burned_subtitles: bool
    file_size_bytes: int
    status: ProcessingStatus
    created_at: str
    score: int
    category: str

class ClipEditRequest(BaseModel):
    start_trim: float = 0.0
    end_trim: float = 0.0
    crop_position: float = 0.5  # 0.0 = left, 0.5 = center, 1.0 = right
    aspect_ratio: str = "9:16"   # "9:16" or "16:9"
    burn_subtitles: bool = True
    subtitle_style: str = "viral_pop" # "viral_pop", "vice_pill", "bold_outline", "minimal_cinematic"
    subtitle_text: Optional[str] = None
    subtitle_position: float = 0.75 # 0.1 top to 0.9 bottom
    highlight_color: str = "#FFE600" # "#FFE600", "#FF795F", "#00F0FF", "#75D6A0"
    font_size: str = "md"
    preset: str = "shorts"

class StreamInfo(BaseModel):
    id: str
    youtube_url: str
    title: str
    channel_name: str
    thumbnail_url: Optional[str]
    status: StreamStatus
    started_at: Optional[str]
    recording_duration_seconds: float = 0.0
    current_chat_rate: float = 0.0
    current_chat_baseline: float = 0.0
    current_audio_db: float = -40.0
    highlights_count: int = 0
    clips_count: int = 0

class StreamStartRequest(BaseModel):
    youtube_url: str
    simulate: bool = False

class StreamActivityPoint(BaseModel):
    timestamp_offset: float
    chat_rate: float
    audio_level: float
    baseline: float
    has_highlight: bool
    highlight_category: Optional[str] = None
    highlight_score: Optional[int] = None

class AnalyticsSummary(BaseModel):
    total_highlights: int
    clips_generated: int
    average_score: float
    peak_chat_rate: float
    baseline_chat_rate: float
    clip_success_rate: float
    categories_distribution: Dict[str, int]
    activity_timeline: List[StreamActivityPoint]
