import pytest
from backend.engine.clipper import video_clipper
from backend.main import app
from fastapi.testclient import TestClient

def test_ffmpeg_filter_detection():
    # Ensure substring false positives like 'bass' -> 'ass' do not occur
    assert video_clipper._has_filter("non_existent_fake_filter_xyz") is False
    # If Homebrew ffmpeg lacks libass, neither 'ass' nor 'subtitles' should be wrongly True
    has_bass = video_clipper._has_filter("bass")
    assert has_bass is True  # FFmpeg has audio bass filter
    has_ass = video_clipper._has_filter("ass")
    # 'ass' must not be confused with 'bass'
    assert has_ass is False

def test_media_head_and_range_requests():
    client = TestClient(app)
    # HEAD request on media
    response = client.head("/api/media/simulated_stream.mp4")
    assert response.status_code == 200
    assert "content-length" in response.headers
    assert response.headers.get("accept-ranges") == "bytes"

    # Range request
    range_resp = client.get("/api/media/simulated_stream.mp4", headers={"Range": "bytes=0-100"})
    assert range_resp.status_code == 206
    assert "bytes 0-100/" in range_resp.headers.get("content-range", "")
