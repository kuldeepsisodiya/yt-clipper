import pytest
from backend.engine.kick_monitor import KickMonitor
from backend.engine.clipper import VideoClipper
import os

def test_kick_url_slug_extraction():
    urls = [
        ("https://kick.com/xqc", "xqc"),
        ("http://kick.com/adinross", "adinross"),
        ("kick.com/westcol", "westcol"),
        ("https://kick.com/trainwreckstv?sub=1", "trainwreckstv"),
    ]
    for url, expected in urls:
        assert KickMonitor.extract_slug(url) == expected

def test_styled_subtitles_generation(tmp_path):
    clipper = VideoClipper()
    srt_path = str(tmp_path / "test.srt")
    ass_path = str(tmp_path / "test.ass")

    text = "COPS ON OCEAN DRIVE 5 STARS INCOMING JUMP THE BRIDGE"
    clipper._generate_styled_subtitles(
        srt_path=srt_path,
        ass_path=ass_path,
        text=text,
        duration=15.0,
        style="viral_pop",
        highlight_color="#FFE600",
        vertical_pos=0.75
    )

    assert os.path.exists(srt_path)
    assert os.path.exists(ass_path)

    # Verify SRT format
    with open(srt_path, "r") as f:
        srt_content = f.read()
        assert "-->" in srt_content
        assert "COPS ON OCEAN" in srt_content

    # Verify ASS format
    with open(ass_path, "r") as f:
        ass_content = f.read()
        assert "[Script Info]" in ass_content
        assert "Dialogue: 0" in ass_content
        assert "Arial Black" in ass_content
