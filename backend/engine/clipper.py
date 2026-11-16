import os
import subprocess
import asyncio
import logging
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from backend.config import CLIPS_DIR, THUMBNAILS_DIR
from backend import database

logger = logging.getLogger("vice_clips.clipper")

class VideoClipper:
    def __init__(self):
        self.queue = asyncio.Queue()
        self.worker_task = None
        self.processing_clips = set()

    @staticmethod
    def _has_filter(filter_name: str) -> bool:
        """Check if FFmpeg supports an exact filter name without false positive substring matches."""
        try:
            chk = subprocess.run(["ffmpeg", "-filters"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
            for line in chk.stdout.splitlines():
                m = re.match(r'^\s*([T\.SC]+)\s+([a-zA-Z0-9_]+)\s+', line)
                if m and m.group(2) == filter_name:
                    return True
        except Exception:
            pass
        return False

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
        burn_subtitles: bool = True,
        subtitle_style: str = "viral_pop",
        speech_text: Optional[str] = None,
        subtitle_position: float = 0.75,
        highlight_color: str = "#FFE600",
        font_size: str = "md"
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
            "speech_text": speech_text,
            "subtitle_position": subtitle_position,
            "highlight_color": highlight_color,
            "font_size": font_size
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
        burn_subs = job.get("burn_subtitles", True)
        sub_style = job.get("subtitle_style", "viral_pop")
        speech_text = job.get("speech_text")
        sub_pos = job.get("subtitle_position", 0.75)
        hl_color = job.get("highlight_color", "#FFE600")

        landscape_filename = f"{clip_id}_landscape.mp4"
        vertical_filename = f"{clip_id}_vertical.mp4"
        thumb_filename = f"{clip_id}_thumb.jpg"
        srt_filename = f"{clip_id}.srt"
        ass_filename = f"{clip_id}.ass"

        landscape_path = str(CLIPS_DIR / landscape_filename)
        vertical_path = str(CLIPS_DIR / vertical_filename)
        thumb_path = str(THUMBNAILS_DIR / thumb_filename)
        srt_path = str(CLIPS_DIR / srt_filename)
        ass_path = str(CLIPS_DIR / ass_filename)

        # 1. Generate viral short-form subtitle files (both SRT and ASS with karaoke styling)
        self._generate_styled_subtitles(
            srt_path=srt_path,
            ass_path=ass_path,
            text=speech_text or f"GTA VI: {title}",
            duration=dur,
            style=sub_style,
            highlight_color=hl_color,
            vertical_pos=sub_pos
        )

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

        # 3. Extract High-Res Video Thumbnail
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

        # Check for real filter support (exact name match, avoid substring matching like 'bass' matching 'ass')
        has_ass_filter = self._has_filter("ass")
        has_sub_filter = self._has_filter("subtitles")

        x_expr = f"(in_w - in_h*9/16)*{crop_pos}"
        video_filter = f"crop=in_h*9/16:in_h:{x_expr}:0,scale=1080:1920:flags=lanczos"

        # 4. Generate 9:16 Vertical Short (1080x1920)
        # Cropping from landscape_path is 10x faster and guarantees 100% audio-video sync
        applied_sub_filter = video_filter
        if burn_subs and has_ass_filter and os.path.exists(ass_path):
            escaped_ass = ass_path.replace(":", "\\:").replace("'", "\\'")
            applied_sub_filter += f",ass='{escaped_ass}'"
        elif burn_subs and has_sub_filter and os.path.exists(srt_path):
            escaped_srt = srt_path.replace(":", "\\:").replace("'", "\\'")
            applied_sub_filter += f",subtitles='{escaped_srt}'"

        cmd_vertical = [
            "ffmpeg", "-y",
            "-i", landscape_path,
            "-vf", applied_sub_filter,
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "copy",
            "-movflags", "+faststart",
            vertical_path
        ]
        res_v = subprocess.run(cmd_vertical, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res_v.returncode != 0:
            logger.warning(f"Vertical export with filter failed, retrying clean crop: {res_v.stderr[-200:]}")
            cmd_clean = [
                "ffmpeg", "-y",
                "-i", landscape_path,
                "-vf", video_filter,
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "22",
                "-c:a", "copy",
                "-movflags", "+faststart",
                vertical_path
            ]
            res_clean = subprocess.run(cmd_clean, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res_clean.returncode != 0:
                logger.error(f"FFmpeg vertical clean export also failed: {res_clean.stderr[-200:]}")

        vertical_ready = os.path.exists(vertical_path) and os.path.getsize(vertical_path) > 0
        file_size = os.path.getsize(vertical_path) if vertical_ready else os.path.getsize(landscape_path)

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
            file_path_vertical=f"/api/media/{vertical_filename}" if vertical_ready else f"/api/media/{landscape_filename}",
            thumbnail_url=f"/api/media/{thumb_filename}",
            srt_url=f"/api/media/{srt_filename}",
            file_size_bytes=file_size
        )

        database.update_highlight_status(highlight_id, "Ready", clip_id=clip_id)
        logger.info(f"Clip {clip_id} generated successfully (vertical ready: {vertical_ready})!")

    def _generate_styled_subtitles(
        self,
        srt_path: str,
        ass_path: str,
        text: str,
        duration: float,
        style: str = "viral_pop",
        highlight_color: str = "#FFE600",
        vertical_pos: float = 0.75
    ):
        """
        Splits speech into viral punchy 2-4 word phrases with modern TikTok / Shorts styling.
        Generates both SRT (universal) and ASS (Advanced SubStation Alpha with precise font, outline, and positioning).
        """
        words = text.strip().split()
        if not words:
            words = ["GTA VI", "VICE CITY", "HIGHLIGHT"]

        # Chunk into groups of 3-4 words for fast viral reading
        chunks: List[str] = []
        chunk_size = 3
        for i in range(0, len(words), chunk_size):
            chunks.append(" ".join(words[i:i + chunk_size]).upper())

        num_chunks = len(chunks)
        time_per_chunk = min(2.5, max(1.2, duration / max(1, num_chunks)))

        srt_lines = []
        ass_events = []

        margin_v = int(vertical_pos * 100) # Margin from bottom in ASS (e.g. 75)

        for i, chunk in enumerate(chunks):
            start_s = i * time_per_chunk
            end_s = min(duration, (i + 1) * time_per_chunk)

            # Format SRT timestamp
            start_srt = self._sec_to_srt_time(start_s)
            end_srt = self._sec_to_srt_time(end_s)

            srt_lines.append(str(i + 1))
            srt_lines.append(f"{start_srt} --> {end_srt}")
            srt_lines.append(chunk)
            srt_lines.append("")

            # Format ASS timestamp
            start_ass = self._sec_to_ass_time(start_s)
            end_ass = self._sec_to_ass_time(end_s)
            # Add dynamic highlight on the last word of chunk
            chunk_words = chunk.split()
            if len(chunk_words) > 1:
                highlighted_chunk = " ".join(chunk_words[:-1]) + f" {{\\c&H00E6FF&}}{chunk_words[-1]}{{\\r}}"
            else:
                highlighted_chunk = f"{{\\c&H00E6FF&}}{chunk}{{\\r}}"

            ass_events.append(f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,{highlighted_chunk}")

        # Write SRT
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(srt_lines))

        # Write ASS (Advanced SubStation Alpha)
        ass_header = f"""[Script Info]
Title: Vice Clips Viral Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,62,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,5,3,2,40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(ass_header + "\n".join(ass_events) + "\n")

    @staticmethod
    def _sec_to_srt_time(sec: float) -> str:
        hrs = int(sec // 3600)
        mins = int((sec % 3600) // 60)
        secs = int(sec % 60)
        ms = int((sec - int(sec)) * 1000)
        return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"

    @staticmethod
    def _sec_to_ass_time(sec: float) -> str:
        hrs = int(sec // 3600)
        mins = int((sec % 3600) // 60)
        secs = int(sec % 60)
        cs = int((sec - int(sec)) * 100)
        return f"{hrs:d}:{mins:02d}:{secs:02d}.{cs:02d}"

video_clipper = VideoClipper()
