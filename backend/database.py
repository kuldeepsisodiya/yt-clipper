import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.config import DB_PATH, settings
from backend.models import (
    StreamStatus, ProcessingStatus, GTAEventCategory,
    HighlightResponse, ClipResponse, StreamInfo, StreamActivityPoint
)

def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS streams (
        id TEXT PRIMARY KEY,
        youtube_url TEXT NOT NULL,
        title TEXT,
        channel_name TEXT,
        thumbnail_url TEXT,
        status TEXT DEFAULT 'idle',
        started_at TEXT,
        stopped_at TEXT,
        stats_json TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY,
        stream_id TEXT NOT NULL,
        timestamp_offset REAL NOT NULL,
        absolute_timestamp TEXT,
        category TEXT NOT NULL,
        score INTEGER NOT NULL,
        reasons_json TEXT,
        chat_rate REAL DEFAULT 0.0,
        audio_level REAL DEFAULT 0.0,
        speech_text TEXT,
        duration_sec REAL DEFAULT 30.0,
        detection_type TEXT DEFAULT 'detected',
        status TEXT DEFAULT 'Detected',
        is_favorite INTEGER DEFAULT 0,
        clip_id TEXT,
        thumbnail_url TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (stream_id) REFERENCES streams(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clips (
        id TEXT PRIMARY KEY,
        highlight_id TEXT NOT NULL,
        stream_id TEXT NOT NULL,
        title TEXT NOT NULL,
        file_path_landscape TEXT,
        file_path_vertical TEXT,
        thumbnail_url TEXT,
        srt_url TEXT,
        duration REAL NOT NULL,
        aspect_ratio TEXT DEFAULT '9:16',
        crop_position REAL DEFAULT 0.5,
        subtitle_style TEXT DEFAULT 'clean_white',
        burned_subtitles INTEGER DEFAULT 0,
        file_size_bytes INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Ready',
        created_at TEXT NOT NULL,
        FOREIGN KEY (highlight_id) REFERENCES highlights(id),
        FOREIGN KEY (stream_id) REFERENCES streams(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id TEXT NOT NULL,
        timestamp_offset REAL NOT NULL,
        chat_rate REAL NOT NULL,
        audio_level REAL NOT NULL,
        baseline REAL NOT NULL,
        has_highlight INTEGER DEFAULT 0,
        highlight_category TEXT,
        highlight_score INTEGER,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        settings_json TEXT NOT NULL
    )
    """)

    # Initialize default settings if not exists
    cursor.execute("SELECT id FROM app_settings WHERE id = 1")
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO app_settings (id, settings_json) VALUES (1, ?)",
            (json.dumps(settings.model_dump()),)
        )

    conn.commit()
    conn.close()

# Database CRUD helpers

def get_current_stream() -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM streams 
        WHERE status IN ('recording', 'simulating') 
        ORDER BY started_at DESC LIMIT 1
    """)
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_latest_stream() -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM streams ORDER BY started_at DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def create_stream(stream_id: str, youtube_url: str, title: str, channel_name: str, thumbnail_url: str, status: str = "recording") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO streams (id, youtube_url, title, channel_name, thumbnail_url, status, started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (stream_id, youtube_url, title, channel_name, thumbnail_url, status, now))
    conn.commit()
    conn.close()
    return {
        "id": stream_id,
        "youtube_url": youtube_url,
        "title": title,
        "channel_name": channel_name,
        "thumbnail_url": thumbnail_url,
        "status": status,
        "started_at": now
    }

def update_stream_status(stream_id: str, status: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        UPDATE streams SET status = ?, stopped_at = ? WHERE id = ?
    """, (status, now if status == 'stopped' else None, stream_id))
    conn.commit()
    conn.close()

def insert_highlight(
    stream_id: str,
    timestamp_offset: float,
    category: str,
    score: int,
    reasons: List[str],
    chat_rate: float = 0.0,
    audio_level: float = 0.0,
    speech_text: Optional[str] = None,
    duration_sec: float = 30.0,
    detection_type: str = "detected",
    status: str = "Detected",
    thumbnail_url: Optional[str] = None
) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    highlight_id = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO highlights (
            id, stream_id, timestamp_offset, absolute_timestamp, category, score,
            reasons_json, chat_rate, audio_level, speech_text, duration_sec,
            detection_type, status, thumbnail_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        highlight_id, stream_id, timestamp_offset, now, category, score,
        json.dumps(reasons), chat_rate, audio_level, speech_text, duration_sec,
        detection_type, status, thumbnail_url, now
    ))
    conn.commit()
    conn.close()
    return highlight_id

def get_highlights(
    stream_id: Optional[str] = None,
    category: Optional[str] = None,
    min_score: Optional[int] = None,
    reviewed: Optional[bool] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM highlights WHERE 1=1"
    params = []

    if stream_id:
        query += " AND stream_id = ?"
        params.append(stream_id)
    if category and category != "all":
        query += " AND category = ?"
        params.append(category)
    if min_score is not None:
        query += " AND score >= ?"
        params.append(min_score)
    if reviewed is not None:
        if reviewed:
            query += " AND status = 'Reviewed'"
        else:
            query += " AND status != 'Reviewed'"

    query += " ORDER BY timestamp_offset DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        item = dict(row)
        item["reasons"] = json.loads(item["reasons_json"]) if item["reasons_json"] else []
        item["is_favorite"] = bool(item["is_favorite"])
        result.append(item)
    return result

def get_highlight_by_id(highlight_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM highlights WHERE id = ?", (highlight_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        item = dict(row)
        item["reasons"] = json.loads(item["reasons_json"]) if item["reasons_json"] else []
        item["is_favorite"] = bool(item["is_favorite"])
        return item
    return None

def update_highlight_status(highlight_id: str, status: str, clip_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if clip_id:
        cursor.execute("UPDATE highlights SET status = ?, clip_id = ? WHERE id = ?", (status, clip_id, highlight_id))
    else:
        cursor.execute("UPDATE highlights SET status = ? WHERE id = ?", (status, highlight_id))
    conn.commit()
    conn.close()

def toggle_highlight_favorite(highlight_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_favorite FROM highlights WHERE id = ?", (highlight_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    new_val = 0 if row["is_favorite"] else 1
    cursor.execute("UPDATE highlights SET is_favorite = ? WHERE id = ?", (new_val, highlight_id))
    conn.commit()
    conn.close()
    return bool(new_val)

def delete_highlight(highlight_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM highlights WHERE id = ?", (highlight_id,))
    cursor.execute("DELETE FROM clips WHERE highlight_id = ?", (highlight_id,))
    conn.commit()
    conn.close()

def insert_clip(
    highlight_id: str,
    stream_id: str,
    title: str,
    duration: float,
    aspect_ratio: str = "9:16",
    crop_position: float = 0.5,
    subtitle_style: str = "clean_white",
    burned_subtitles: bool = False,
    file_path_landscape: Optional[str] = None,
    file_path_vertical: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    srt_url: Optional[str] = None,
    file_size_bytes: int = 0
) -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    clip_id = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO clips (
            id, highlight_id, stream_id, title, file_path_landscape, file_path_vertical,
            thumbnail_url, srt_url, duration, aspect_ratio, crop_position,
            subtitle_style, burned_subtitles, file_size_bytes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        clip_id, highlight_id, stream_id, title, file_path_landscape, file_path_vertical,
        thumbnail_url, srt_url, duration, aspect_ratio, crop_position,
        subtitle_style, 1 if burned_subtitles else 0, file_size_bytes, "Ready", now
    ))
    conn.commit()
    conn.close()
    return clip_id

def get_clips(stream_id: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT c.*, h.category, h.score 
        FROM clips c
        LEFT JOIN highlights h ON c.highlight_id = h.id
        WHERE 1=1
    """
    params = []
    if stream_id:
        query += " AND c.stream_id = ?"
        params.append(stream_id)
    if category and category != "all":
        query += " AND h.category = ?"
        params.append(category)

    query += " ORDER BY c.created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_clip_by_id(clip_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, h.category, h.score, h.reasons_json
        FROM clips c
        LEFT JOIN highlights h ON c.highlight_id = h.id
        WHERE c.id = ?
    """, (clip_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        item = dict(row)
        item["reasons"] = json.loads(item["reasons_json"]) if item["reasons_json"] else []
        return item
    return None

def delete_clip(clip_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM clips WHERE id = ?", (clip_id,))
    cursor.execute("UPDATE highlights SET clip_id = NULL, status = 'Detected' WHERE clip_id = ?", (clip_id,))
    conn.commit()
    conn.close()

def log_activity(
    stream_id: str,
    timestamp_offset: float,
    chat_rate: float,
    audio_level: float,
    baseline: float,
    has_highlight: bool = False,
    highlight_category: Optional[str] = None,
    highlight_score: Optional[int] = None
):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO activity_logs (
            stream_id, timestamp_offset, chat_rate, audio_level, baseline,
            has_highlight, highlight_category, highlight_score, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        stream_id, timestamp_offset, chat_rate, audio_level, baseline,
        1 if has_highlight else 0, highlight_category, highlight_score, now
    ))
    conn.commit()
    conn.close()

def get_activity_logs(stream_id: str, limit: int = 120) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT timestamp_offset, chat_rate, audio_level, baseline, has_highlight,
               highlight_category, highlight_score
        FROM activity_logs
        WHERE stream_id = ?
        ORDER BY timestamp_offset DESC LIMIT ?
    """, (stream_id, limit))
    rows = cursor.fetchall()
    conn.close()
    # Reverse to chronological order
    return [dict(r) for r in reversed(rows)]

def get_settings() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT settings_json FROM app_settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row and row["settings_json"]:
        return json.loads(row["settings_json"])
    return settings.model_dump()

def update_settings(new_settings: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE app_settings SET settings_json = ? WHERE id = 1", (json.dumps(new_settings),))
    conn.commit()
    conn.close()
