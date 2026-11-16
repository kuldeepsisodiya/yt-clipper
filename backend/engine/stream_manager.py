import os
import time
import asyncio
import subprocess
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from backend.config import RECORDINGS_DIR, settings
from backend import database
from backend.engine.chat_monitor import ChatMonitor
from backend.engine.event_detector import EventDetector
from backend.engine.audio_analyzer import AudioAnalyzer
from backend.engine.clipper import video_clipper
from backend.engine.kick_monitor import kick_monitor

logger = logging.getLogger("vice_clips.stream")

class StreamManager:
    def __init__(self):
        self.active_stream_id: Optional[str] = None
        self.stream_info: Dict[str, Any] = {}
        self.recording_process: Optional[subprocess.Popen] = None
        self.current_recording_path: Optional[str] = None
        self.start_time: float = 0.0
        self.is_running: bool = False
        self.platform: str = "youtube"

        # Subsystems
        self.chat_monitor = ChatMonitor(
            bucket_seconds=settings.chat_bucket_seconds,
            baseline_window_seconds=settings.chat_baseline_window_seconds,
            spike_threshold=settings.chat_spike_threshold,
            min_messages=settings.chat_min_messages,
            cooldown_seconds=settings.chat_cooldown_seconds
        )
        self.event_detector = EventDetector(settings)
        self.audio_analyzer = AudioAnalyzer()

        # Callbacks for WebSockets / SSE
        self.broadcast_callbacks = []

    def register_broadcast_callback(self, cb):
        self.broadcast_callbacks.append(cb)

    async def broadcast_event(self, event_type: str, data: Any):
        for cb in self.broadcast_callbacks:
            try:
                await cb(event_type, data)
            except Exception as e:
                pass

    async def get_stream_metadata(self, stream_url: str) -> Dict[str, Any]:
        """
        Inspects stream metadata for YouTube or Kick.
        """
        if "kick.com" in stream_url.lower():
            slug = kick_monitor.extract_slug(stream_url) or "kick_stream"
            info = await kick_monitor.fetch_channel_info(slug)
            return {
                "title": info.get("title", f"GTA VI — {slug} Live"),
                "channel": info.get("username", slug),
                "thumbnail": info.get("thumbnail"),
                "is_live": info.get("is_live", True),
                "url": stream_url,
                "platform": "kick",
                "chatroom_id": info.get("chatroom_id")
            }

        # YouTube probing via yt-dlp
        try:
            cmd = ["yt-dlp", "--dump-json", "--no-warnings", stream_url]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15)
            if res.returncode == 0:
                import json
                info = json.loads(res.stdout)
                return {
                    "title": info.get("title", "GTA VI Live Stream"),
                    "channel": info.get("uploader", info.get("channel", "Vice City Streamer")),
                    "thumbnail": info.get("thumbnail", "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"),
                    "is_live": info.get("is_live", False),
                    "url": stream_url,
                    "platform": "youtube"
                }
        except Exception as e:
            logger.warning(f"yt-dlp metadata probe warning: {e}")

        return {
            "title": "GTA VI — Vice City Nights Livestream",
            "channel": "Vice City Gaming",
            "thumbnail": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "is_live": True,
            "url": stream_url,
            "platform": "youtube"
        }

    async def start_stream(self, stream_url: str) -> Dict[str, Any]:
        if self.is_running:
            await self.stop_stream()

        stream_id = f"stream_{int(time.time())}"
        metadata = await self.get_stream_metadata(stream_url)
        self.platform = metadata.get("platform", "youtube")

        self.active_stream_id = stream_id
        self.start_time = time.time()
        self.is_running = True

        database.create_stream(
            stream_id=stream_id,
            youtube_url=stream_url,
            title=f"[{self.platform.upper()}] {metadata['title']}",
            channel_name=metadata["channel"],
            thumbnail_url=metadata["thumbnail"],
            status="recording"
        )

        recording_file = RECORDINGS_DIR / f"{stream_id}_buffer.mp4"
        self.current_recording_path = str(recording_file)

        # Launch recording via yt-dlp (supports both YouTube and Kick)
        try:
            cmd = [
                "yt-dlp",
                "-o", self.current_recording_path,
                "--no-part",
                "--buffer-size", "16K",
                stream_url
            ]
            self.recording_process = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            logger.info(f"Stream recording started for {self.platform}: {stream_id}")
        except Exception as e:
            logger.error(f"Failed to launch yt-dlp recording: {e}")

        # If Kick platform, connect to live Pusher chatroom
        if self.platform == "kick" and metadata.get("chatroom_id"):
            def on_kick_message(author: str, text: str):
                offset = time.time() - self.start_time if self.start_time else 0.0
                spike = self.chat_monitor.add_message(author, text, offset)
                if spike:
                    asyncio.create_task(self._handle_chat_spike(spike))

            await kick_monitor.connect_chat(metadata["chatroom_id"], on_kick_message)
            logger.info(f"Connected live Kick chatroom {metadata['chatroom_id']}")

        # Start background monitor loop
        asyncio.create_task(self._stream_monitor_loop(stream_id))

        return {
            "id": stream_id,
            "title": metadata["title"],
            "channel": metadata["channel"],
            "thumbnail": metadata["thumbnail"],
            "status": "recording",
            "platform": self.platform
        }

    async def stop_stream(self):
        if not self.is_running:
            return

        self.is_running = False
        if self.platform == "kick":
            await kick_monitor.stop()

        if self.recording_process:
            try:
                self.recording_process.terminate()
                self.recording_process.wait(timeout=5)
            except Exception:
                self.recording_process.kill()
            self.recording_process = None

        if self.active_stream_id:
            database.update_stream_status(self.active_stream_id, "stopped")
            logger.info(f"Stream {self.active_stream_id} stopped")
            self.active_stream_id = None

    async def _handle_chat_spike(self, spike: Dict[str, Any]):
        """Triggered automatically when chat spike trips the 2.5x threshold."""
        if not self.active_stream_id:
            return

        offset = spike.get("timestamp_offset", 0.0)
        sample_msgs = spike.get("sample_messages", [])
        
        category, det_type, conf = self.event_detector.infer_category(sample_msgs)
        score, reasons = self.event_detector.calculate_highlight_score(
            chat_spike_ratio=spike.get("spike_ratio", 2.5),
            reaction_density=spike.get("reaction_density", 0.5),
            audio_level_db=-14.0,
            has_excited_speech=True,
            is_manual_marker=False
        )

        highlight_id = database.insert_highlight(
            stream_id=self.active_stream_id,
            timestamp_offset=round(offset, 1),
            category=category.value,
            score=score,
            reasons=reasons,
            chat_rate=float(spike.get("count", 15)),
            audio_level=-14.0,
            speech_text=f"Live {self.platform.capitalize()} moment: {category.value}",
            duration_sec=30.0,
            detection_type=det_type,
            status="Processing"
        )

        # Enqueue clip generation if media is ready
        if self.current_recording_path and os.path.exists(self.current_recording_path):
            video_clipper.enqueue_clip_generation(
                stream_id=self.active_stream_id,
                highlight_id=highlight_id,
                source_media_path=self.current_recording_path,
                start_time_sec=max(0.0, offset - settings.clip_before_seconds),
                duration_sec=30.0,
                title=f"{category.value} ({self.platform.capitalize()})",
                crop_position=settings.default_crop_position,
                burn_subtitles=True,
                subtitle_style=settings.subtitle_style
            )

        await self.broadcast_event("highlight_detected", {
            "id": highlight_id,
            "stream_id": self.active_stream_id,
            "category": category.value,
            "score": score,
            "reasons": reasons,
            "offset": round(offset, 1),
            "platform": self.platform
        })

    async def _stream_monitor_loop(self, stream_id: str):
        """Monitors live activity, records periodic metrics, logs and checks spikes."""
        video_clipper.start_worker()

        while self.is_running and self.active_stream_id == stream_id:
            offset = time.time() - self.start_time
            rate, baseline = self.chat_monitor.get_current_stats(offset)
            audio_db = -24.0

            database.log_activity(
                stream_id=stream_id,
                timestamp_offset=round(offset, 1),
                chat_rate=rate,
                audio_level=audio_db,
                baseline=baseline,
                has_highlight=False
            )

            await self.broadcast_event("stream_pulse", {
                "stream_id": stream_id,
                "timestamp_offset": round(offset, 1),
                "chat_rate": rate,
                "baseline": baseline,
                "audio_level": audio_db,
                "platform": self.platform
            })

            await asyncio.sleep(2.0)

    async def trigger_manual_marker(self, category: str, notes: Optional[str] = None, duration: float = 30.0) -> str:
        """Allows creator to drop an instant highlight marker during the stream."""
        if not self.active_stream_id:
            latest = database.get_latest_stream()
            stream_id = latest["id"] if latest else "stream_manual"
        else:
            stream_id = self.active_stream_id

        offset = time.time() - self.start_time if self.start_time else 60.0
        score, reasons = self.event_detector.calculate_highlight_score(
            chat_spike_ratio=2.5,
            reaction_density=0.5,
            audio_level_db=-14.0,
            has_excited_speech=True,
            is_manual_marker=True
        )

        highlight_id = database.insert_highlight(
            stream_id=stream_id,
            timestamp_offset=round(offset, 1),
            category=category,
            score=score,
            reasons=reasons,
            chat_rate=18.0,
            audio_level=-14.0,
            speech_text=notes or "Creator manually marked this highlight moment",
            duration_sec=duration,
            detection_type="manual",
            status="Detected"
        )

        if self.current_recording_path and os.path.exists(self.current_recording_path):
            video_clipper.enqueue_clip_generation(
                stream_id=stream_id,
                highlight_id=highlight_id,
                source_media_path=self.current_recording_path,
                start_time_sec=max(0.0, offset - settings.clip_before_seconds),
                duration_sec=duration,
                title=f"{category} (Manual)",
                crop_position=settings.default_crop_position,
                burn_subtitles=True,
                subtitle_style=settings.subtitle_style
            )

        await self.broadcast_event("highlight_detected", {
            "id": highlight_id,
            "stream_id": stream_id,
            "category": category,
            "score": score,
            "reasons": reasons,
            "offset": round(offset, 1),
            "platform": self.platform
        })

        return highlight_id

stream_manager = StreamManager()
