import os
import subprocess
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from backend.config import CLIPS_DIR, THUMBNAILS_DIR
from backend import database

logger = logging.getLogger("vice_clips.clipper")

class VideoClipper:
    def __init__(self):
        self.queue = asyncio.Queue()
        self.worker_task = None
        self.processing_clips = set()

    def start_worker(self):
        if not self.worker_task or self.worker_task.done():
            self.worker_task = asyncio.create_task(self._process_queue())

    async def _process_queue(self):
        logger.info("Video clipping background worker started")
        while True:
            job = await self.queue.get()
            clip_id = job.get("clip_id")
            try:
                self.processing_clips.add(clip_id)
                await asyncio.to_thread(self._execute_clip_job, job)
            except Exception as e:
                logger.error(f"Clip generation failed for {clip_id}: {e}", exc_info=True)
                database.update_highlight_status(job.get("highlight_id"), "Failed")
            finally:
                self.processing_clips.discard(clip_id)
                self.queue.task_done()

    def enqueue_clip_generation(
        self,
        stream_id: str,
        highlight_id: str,
        source_media_path: str,
        start_time_sec: float,
        duration_sec: float,
        title: str,
        crop_position: float = 0.5,
        burn_subtitles: bool = False,
        subtitle_style: str = "clean_white",
        speech_text: Optional[str] = None
    ) -> str:
        clip_id = f"clip_{highlight_id}"
        
        job = {
            "clip_id": clip_id,
            "highlight_id": highlight_id,
            "stream_id": stream_id,
            "source_media_path": source_media_path,
            "start_time_sec": max(0.0, start_time_sec),
            "duration_sec": duration_sec,
            "title": title,
            "crop_position": crop_position,
            "burn_subtitles": burn_subtitles,
            "subtitle_style": subtitle_style,
            "speech_text": speech_text
        }

        # Update highlight status to Processing
        database.update_highlight_status(highlight_id, "Processing", clip_id=clip_id)
        
        # Enqueue
        self.queue.put_nowait(job)
        return clip_id

    def _execute_clip_job(self, job: Dict[str, Any]):
        clip_id = job["clip_id"]
        highlight_id = job["highlight_id"]
        stream_id = job["stream_id"]
        src = job["source_media_path"]
        start = job["start_time_sec"]
        dur = job["duration_sec"]
        title = job["title"]
        crop_pos = job.get("crop_position", 0.5)
        burn_subs = job.get("burn_subtitles", False)
        sub_style = job.get("subtitle_style", "clean_white")
        speech_text = job.get("speech_text")

        landscape_filename = f"{clip_id}_landscape.mp4"
        vertical_filename = f"{clip_id}_vertical.mp4"
        thumb_filename = f"{clip_id}_thumb.jpg"
        srt_filename = f"{clip_id}.srt"

        landscape_path = str(CLIPS_DIR / landscape_filename)
        vertical_path = str(CLIPS_DIR / vertical_filename)
        thumb_path = str(THUMBNAILS_DIR / thumb_filename)
        srt_path = str(CLIPS_DIR / srt_filename)

        # 1. Generate SRT subtitle file if speech or text is available
        self._generate_srt_file(srt_path, speech_text or f"Vice City Highlight: {title}", dur)

        # 2. Extract Landscape clip (16:9 H.264 MP4 with sync)
        cmd_landscape = [
            "ffmpeg", "-y",
            "-ss", str(start),
            "-i", src,
            "-t", str(dur),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            landscape_path
        ]
        res = subprocess.run(cmd_landscape, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            logger.error(f"FFmpeg landscape export failed: {res.stderr}")
            raise RuntimeError(f"FFmpeg landscape export error: {res.stderr[-200:]}")

        # 3. Extract High-Res Video Thumbnail from middle of clip
        thumb_time = max(0.0, start + min(dur / 2.0, 3.0))
        cmd_thumb = [
            "ffmpeg", "-y",
            "-ss", str(thumb_time),
            "-i", src,
            "-vframes", "1",
            "-q:v", "2",
            thumb_path
        ]
        subprocess.run(cmd_thumb, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 4. Generate 9:16 Vertical Short (1080x1920) with intelligent crop position
        # FFmpeg filter:
        # Given 16:9 1920x1080 input:
        # vertical crop aspect ratio 9:16 means width = height * 9 / 16. For 1080 height, width = 607.5.
        # X offset is calculated as: (in_w - out_w) * crop_position
        # e.g., (1920 - 608) * crop_position.
        # Then scale up to 1080x1920!
        x_expr = f"(in_w - in_h*9/16)*{crop_pos}"
        video_filter = f"crop=in_h*9/16:in_h:{x_expr}:0,scale=1080:1920:flags=lanczos"

        # Apply subtitle burning if supported by local ffmpeg build
        has_sub_filter = False
        try:
            chk = subprocess.run(["ffmpeg", "-filters"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            has_sub_filter = "subtitles" in chk.stdout.lower()
        except Exception:
            pass

        if burn_subs and has_sub_filter and os.path.exists(srt_path):
            escaped_srt = srt_path.replace(":", "\\:").replace("'", "\\'")
            video_filter += f",subtitles='{escaped_srt}'"

        cmd_vertical = [
            "ffmpeg", "-y",
            "-ss", str(start),
            "-i", src,
            "-t", str(dur),
            "-vf", video_filter,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            vertical_path
        ]
        subprocess.run(cmd_vertical, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        file_size = os.path.getsize(vertical_path) if os.path.exists(vertical_path) else os.path.getsize(landscape_path)

        # 5. Insert into Database
        database.insert_clip(
            highlight_id=highlight_id,
            stream_id=stream_id,
            title=title,
            duration=dur,
            aspect_ratio="9:16",
            crop_position=crop_pos,
            subtitle_style=sub_style,
            burned_subtitles=burn_subs,
            file_path_landscape=f"/api/media/{landscape_filename}",
            file_path_vertical=f"/api/media/{vertical_filename}",
            thumbnail_url=f"/api/media/{thumb_filename}",
            srt_url=f"/api/media/{srt_filename}",
            file_size_bytes=file_size
        )

        database.update_highlight_status(highlight_id, "Ready", clip_id=clip_id)
        logger.info(f"Clip {clip_id} generated successfully!")

    def _generate_srt_file(self, srt_path: str, text: str, duration: float):
        """Generates a clean SRT subtitle file for the clip."""
        lines = [
            "1",
            "00:00:01,000 --> 00:00:05,000",
            text[:60],
            ""
        ]
        if len(text) > 60:
            lines.extend([
                "2",
                "00:00:05,500 --> 00:00:10,000",
                text[60:120],
                ""
            ])
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

video_clipper = VideoClipper()
