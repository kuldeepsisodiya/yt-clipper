import os
import time
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from backend.config import CLIPS_DIR, THUMBNAILS_DIR, RECORDINGS_DIR, settings
from backend import database
from backend.models import (
    StreamStartRequest, ManualMarkerRequest, ClipEditRequest,
    GTAEventCategory, ProcessingStatus
)
from backend.engine.stream_manager import stream_manager
from backend.engine.simulator import simulator, SIMULATED_STREAM_ID
from backend.engine.clipper import video_clipper

router = APIRouter(prefix="/api")

# Stream routes
@router.get("/stream/status")
async def get_stream_status():
    current = database.get_current_stream()
    if not current:
        latest = database.get_latest_stream()
        return {
            "is_active": False,
            "stream": latest,
            "chat_rate": 0.0,
            "chat_baseline": 0.0,
            "audio_level": -45.0
        }

    offset = time.time() - stream_manager.start_time if stream_manager.start_time else 0.0
    rate, baseline = stream_manager.chat_monitor.get_current_stats(offset)

    return {
        "is_active": True,
        "stream": current,
        "duration_seconds": round(offset, 1),
        "chat_rate": rate,
        "chat_baseline": baseline,
        "audio_level": -22.0
    }

@router.post("/stream/start")
async def start_stream(req: StreamStartRequest):
    if req.simulate:
        await simulator.start()
        return {"status": "started", "mode": "simulation", "stream_id": SIMULATED_STREAM_ID}

    result = await stream_manager.start_stream(req.youtube_url)
    return {"status": "started", "mode": "live", "stream": result}

@router.post("/stream/stop")
async def stop_stream():
    await simulator.stop()
    await stream_manager.stop_stream()
    return {"status": "stopped"}

@router.post("/stream/simulate")
async def toggle_simulate(enable: bool = True):
    if enable:
        await simulator.start()
        return {"status": "simulation_started", "stream_id": SIMULATED_STREAM_ID}
    else:
        await simulator.stop()
        return {"status": "simulation_stopped"}

@router.post("/stream/trigger-highlight")
async def trigger_test_highlight(scenario_index: Optional[int] = None):
    """Triggers an immediate highlight detection for instant UI testing."""
    if not simulator.is_running:
        await simulator.start()
    highlight_id = await simulator.trigger_highlight_scenario(scenario_index)
    return {"status": "triggered", "highlight_id": highlight_id}

@router.post("/highlights/manual-marker")
async def create_manual_marker(req: ManualMarkerRequest):
    highlight_id = await stream_manager.trigger_manual_marker(
        category=req.category.value if hasattr(req.category, 'value') else str(req.category),
        notes=req.notes,
        duration=req.duration_sec
    )
    return {"status": "marked", "highlight_id": highlight_id}

# Highlights routes
@router.get("/highlights")
async def list_highlights(
    category: Optional[str] = None,
    min_score: Optional[int] = None,
    reviewed: Optional[bool] = None,
    limit: int = 100
):
    current = database.get_current_stream()
    stream_id = current["id"] if current else None
    return database.get_highlights(
        stream_id=stream_id,
        category=category,
        min_score=min_score,
        reviewed=reviewed,
        limit=limit
    )

@router.get("/highlights/{highlight_id}")
async def get_highlight(highlight_id: str):
    h = database.get_highlight_by_id(highlight_id)
    if not h:
        raise HTTPException(status_code=404, detail="Highlight not found")
    return h

@router.patch("/highlights/{highlight_id}/status")
async def update_highlight_status_endpoint(highlight_id: str, status_val: str):
    database.update_highlight_status(highlight_id, status_val)
    return {"status": "updated"}

@router.post("/highlights/{highlight_id}/favorite")
async def toggle_favorite(highlight_id: str):
    new_fav = database.toggle_highlight_favorite(highlight_id)
    return {"is_favorite": new_fav}

@router.delete("/highlights/{highlight_id}")
async def delete_highlight_endpoint(highlight_id: str):
    database.delete_highlight(highlight_id)
    return {"status": "deleted"}

# Clips routes
@router.get("/clips")
async def list_clips(category: Optional[str] = None):
    current = database.get_current_stream()
    stream_id = current["id"] if current else None
    return database.get_clips(stream_id=stream_id, category=category)

@router.get("/clips/{clip_id}")
async def get_clip(clip_id: str):
    clip = database.get_clip_by_id(clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return clip

@router.post("/clips/{clip_id}/edit")
async def edit_clip(clip_id: str, req: ClipEditRequest):
    clip = database.get_clip_by_id(clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    highlight = database.get_highlight_by_id(clip["highlight_id"])
    if not highlight:
        raise HTTPException(status_code=404, detail="Associated highlight not found")

    # Re-generate clip with new trims/crops
    src = stream_manager.current_recording_path or simulator.sample_media_path
    if not src or not os.path.exists(src):
        raise HTTPException(status_code=400, detail="Source media recording not found")

    start_sec = max(0.0, highlight["timestamp_offset"] - settings.clip_before_seconds + req.start_trim)
    dur = max(5.0, (highlight["duration_sec"] - req.start_trim - req.end_trim))

    new_clip_id = video_clipper.enqueue_clip_generation(
        stream_id=clip["stream_id"],
        highlight_id=highlight["id"],
        source_media_path=src,
        start_time_sec=start_sec,
        duration_sec=dur,
        title=clip["title"],
        crop_position=req.crop_position,
        burn_subtitles=req.burn_subtitles,
        subtitle_style=req.subtitle_style.value if hasattr(req.subtitle_style, 'value') else req.subtitle_style,
        speech_text=highlight.get("speech_text")
    )

    return {"status": "reprocessing", "clip_id": new_clip_id}

@router.delete("/clips/{clip_id}")
async def delete_clip_endpoint(clip_id: str):
    database.delete_clip(clip_id)
    return {"status": "deleted"}

# Analytics routes
@router.get("/analytics")
async def get_analytics():
    current = database.get_current_stream()
    stream_id = current["id"] if current else None

    highlights = database.get_highlights(stream_id=stream_id, limit=200)
    clips = database.get_clips(stream_id=stream_id)

    total_highlights = len(highlights)
    clips_generated = len(clips)
    avg_score = round(sum(h["score"] for h in highlights) / max(1, total_highlights), 1)

    cat_counts: Dict[str, int] = {}
    for h in highlights:
        cat = h["category"]
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    # Activity timeline
    logs = database.get_activity_logs(stream_id=stream_id or "default", limit=100) if stream_id else []
    peak_chat = max([l["chat_rate"] for l in logs], default=0.0)

    return {
        "total_highlights": total_highlights,
        "clips_generated": clips_generated,
        "average_score": avg_score,
        "peak_chat_rate": peak_chat,
        "baseline_chat_rate": 5.0,
        "clip_success_rate": 100.0 if clips_generated > 0 else 0.0,
        "categories_distribution": cat_counts,
        "activity_timeline": logs
    }

# Recordings routes
@router.get("/recordings")
async def get_recordings():
    items = []
    total_size = 0
    if os.path.exists(RECORDINGS_DIR):
        for f in os.listdir(RECORDINGS_DIR):
            if f.endswith((".mp4", ".ts", ".mkv")):
                fp = RECORDINGS_DIR / f
                sz = os.path.getsize(fp)
                total_size += sz
                items.append({
                    "filename": f,
                    "size_bytes": sz,
                    "size_mb": round(sz / (1024 * 1024), 2),
                    "created_at": time.ctime(os.path.getctime(fp))
                })
    return {
        "files": items,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "buffer_location": str(RECORDINGS_DIR)
    }

# Settings routes
@router.get("/settings")
async def get_app_settings():
    return database.get_settings()

@router.put("/settings")
async def update_app_settings(new_cfg: Dict[str, Any]):
    database.update_settings(new_cfg)
    # also update live monitors
    stream_manager.chat_monitor.reconfigure(
        bucket_seconds=new_cfg.get("chat_bucket_seconds"),
        baseline_window_seconds=new_cfg.get("chat_baseline_window_seconds"),
        spike_threshold=new_cfg.get("chat_spike_threshold"),
        min_messages=new_cfg.get("chat_min_messages"),
        cooldown_seconds=new_cfg.get("chat_cooldown_seconds")
    )
    return {"status": "updated", "settings": new_cfg}

# Media Streaming with HTTP 206 Partial Content (Range header support for fast HTML5 video seek!)
@router.get("/media/{filename}")
async def serve_media(filename: str, request: Request):
    # Locate file in clips, thumbnails, or recordings
    candidates = [
        CLIPS_DIR / filename,
        THUMBNAILS_DIR / filename,
        RECORDINGS_DIR / filename
    ]
    target_path = None
    for c in candidates:
        if c.exists() and c.is_file():
            target_path = c
            break

    if not target_path:
        raise HTTPException(status_code=404, detail="Media file not found")

    file_size = target_path.stat().st_size
    range_header = request.headers.get("range")

    content_type = "video/mp4" if filename.endswith(".mp4") else "image/jpeg" if filename.endswith((".jpg", ".jpeg")) else "text/plain"

    if not range_header or not filename.endswith(".mp4"):
        return FileResponse(str(target_path), media_type=content_type)

    # Parse range: "bytes=start-end"
    try:
        byte_range = range_header.strip().replace("bytes=", "")
        parts = byte_range.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def iterfile():
            with open(target_path, "rb") as f:
                f.seek(start)
                bytes_left = chunk_size
                while bytes_left > 0:
                    read_bytes = min(bytes_left, 64 * 1024)
                    data = f.read(read_bytes)
                    if not data:
                        break
                    bytes_left -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type": content_type
        }
        return StreamingResponse(iterfile(), status_code=206, headers=headers)
    except Exception as e:
        return FileResponse(str(target_path), media_type=content_type)
