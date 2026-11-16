import pytest
import os
import uuid
from backend import database
from backend.models import GTAEventCategory
from backend.engine.chat_monitor import ChatMonitor
from backend.engine.event_detector import EventDetector
from backend.config import settings

def test_database_init_and_crud(tmp_path):
    database.init_db()
    stream_id = f"test_{uuid.uuid4().hex[:8]}"
    stream = database.create_stream(
        stream_id=stream_id,
        youtube_url="https://youtube.com/watch?v=test",
        title="Test GTA Stream",
        channel_name="Tester",
        thumbnail_url="https://example.com/thumb.jpg"
    )
    assert stream["id"] == stream_id

    # Insert highlight
    hl_id = database.insert_highlight(
        stream_id=stream_id,
        timestamp_offset=45.0,
        category=GTAEventCategory.POLICE_CHASE.value,
        score=92,
        reasons=["Chat spike: Extreme", "Audio: Loud peak"],
        chat_rate=22.0,
        audio_level=-10.5
    )
    assert hl_id is not None

    h = database.get_highlight_by_id(hl_id)
    assert h["score"] == 92
    assert h["category"] == "Police Chase"
    assert len(h["reasons"]) == 2

    # Clean up test records
    database.delete_highlight(hl_id)
    database.update_stream_status(stream_id, "stopped")

def test_chat_monitor_spike_detection():
    monitor = ChatMonitor(
        bucket_seconds=10,
        baseline_window_seconds=180,
        spike_threshold=2.5,
        min_messages=5,
        cooldown_seconds=30
    )

    # Establish baseline with 3 messages per bucket
    for t in range(0, 40, 10):
        for i in range(3):
            monitor.add_message(f"user{i}", "just driving around", float(t + i))

    # Add sudden burst of 12 messages with reactions
    spike_event = None
    for i in range(12):
        ev = monitor.add_message(f"user_burst_{i}", "OMG LMAOO HE CRASHED WTF", 42.0)
        if ev:
            spike_event = ev

    # Trigger bucket close
    ev = monitor.add_message("user_close", "cops are everywhere", 55.0)
    if ev:
        spike_event = ev

    assert spike_event is not None
    assert spike_event["count"] >= 5
    assert spike_event["spike_ratio"] >= 2.5
    assert spike_event["reaction_density"] > 0.0

def test_gta_event_detector_and_scoring():
    detector = EventDetector(settings)

    # Test category inference
    texts = [
        "5 stars on him!", "cops are swarming", "heli overhead", "swat team pulled up"
    ]
    category, det_type, conf = detector.infer_category(texts, speech_text="Taking evasive maneuvers!")
    assert category in [GTAEventCategory.FIVE_STAR_WANTED, GTAEventCategory.POLICE_CHASE]
    assert det_type == "inferred"

    # Test score calculation
    score, reasons = detector.calculate_highlight_score(
        chat_spike_ratio=3.8,
        reaction_density=0.6,
        audio_level_db=-9.0,
        has_excited_speech=True,
        is_manual_marker=False
    )
    assert 70 <= score <= 100
    assert any("Chat spike" in r for r in reasons)
    assert any("Audio" in r for r in reasons)
