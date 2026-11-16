import subprocess
import json
import logging
from typing import Optional, Tuple, Dict, Any

logger = logging.getLogger("vice_clips.audio")

class AudioAnalyzer:
    def __init__(self):
        self.whisper_model = None
        self._whisper_checked = False

    def check_whisper_available(self) -> bool:
        if self._whisper_checked:
            return self.whisper_model is not None
        self._whisper_checked = True
        try:
            import whisper
            # Lazy load small/tiny model if available
            self.whisper_model = whisper.load_model("tiny")
            logger.info("OpenAI Whisper tiny model loaded successfully")
            return True
        except Exception as e:
            logger.info(f"Local Whisper not available: {e}. Falling back to audio level and keyword cues.")
            self.whisper_model = None
            return False

    def measure_audio_levels(self, media_path: str, start_sec: float, duration_sec: float) -> float:
        """
        Uses FFmpeg volumedetect filter to measure mean volume in dB for a segment.
        Returns dB level (e.g. -18.4 dB). Default -35.0 dB if failed.
        """
        try:
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(max(0.0, start_sec)),
                "-t", str(duration_sec),
                "-i", media_path,
                "-af", "volumedetect",
                "-vn", "-sn", "-dn",
                "-f", "null", "/dev/null"
            ]
            result = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True, timeout=10)
            stderr = result.stderr

            # Look for max_volume: -X.X dB or mean_volume: -X.X dB
            for line in stderr.splitlines():
                if "max_volume:" in line:
                    val_str = line.split("max_volume:")[1].replace("dB", "").strip()
                    return float(val_str)
                elif "mean_volume:" in line:
                    val_str = line.split("mean_volume:")[1].replace("dB", "").strip()
                    return float(val_str)
        except Exception as e:
            logger.warning(f"Audio level check error: {e}")

        return -32.0

    def transcribe_segment(self, audio_path: str) -> Optional[str]:
        """
        Transcribes audio segment if Whisper is enabled, else returns None.
        """
        if not self.check_whisper_available():
            return None
        try:
            result = self.whisper_model.transcribe(audio_path)
            return result.get("text", "").strip()
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            return None
