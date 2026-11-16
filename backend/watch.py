import sys
import os
import time
import asyncio
import logging
from backend.config import RECORDINGS_DIR
from backend import database
from backend.engine.stream_manager import stream_manager
from backend.engine.clipper import video_clipper
from backend.engine.simulator import simulator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("vice_clips.watch")

async def run_watcher(youtube_url: str):
    database.init_db()
    video_clipper.start_worker()

    print("\n" + "="*60)
    print("  VICE CLIPS — GTA VI Automated Stream Watcher")
    print("  'Capture the chaos. Keep the moments.'")
    print("="*60)

    if youtube_url.lower() in ["demo", "simulate", "test"]:
        print("\n[INFO] Starting in Simulator / Demo mode...")
        await simulator.start()
        print(f"[INFO] Monitoring GTA VI demo stream. Press Ctrl+C to stop.\n")
        try:
            while True:
                await asyncio.sleep(2)
        except KeyboardInterrupt:
            print("\n[INFO] Stopping simulator...")
            await simulator.stop()
            return

    platform_name = "Kick" if "kick.com" in youtube_url.lower() else "YouTube"
    print(f"\n[INFO] Connecting to {platform_name} livestream: {youtube_url}")
    stream = await stream_manager.start_stream(youtube_url)
    print(f"[INFO] Attached to stream: {stream['title']} ({stream['channel']}) [{stream.get('platform', 'unknown').upper()}]")
    print(f"[INFO] Monitoring {platform_name} chat velocity, audio energy, and GTA VI events...")
    print(f"[INFO] Press Ctrl+C to stop recording.\n")

    def on_event(ev_type, data):
        if ev_type == "highlight_detected":
            print("\n" + "*"*60)
            print(f"  >>> HIGHLIGHT DETECTED! <<<")
            print(f"  Category: {data.get('category')}")
            print(f"  Score:    {data.get('score')}/100")
            print(f"  Offset:   {data.get('offset')}s")
            print(f"  Reasons:  {', '.join(data.get('reasons', []))}")
            print(f"  Clip processing enqueued in background...")
            print("*"*60 + "\n")
        elif ev_type == "stream_pulse":
            rate = data.get("chat_rate", 0)
            offset = data.get("timestamp_offset", 0)
            mins = int(offset // 60)
            secs = int(offset % 60)
            sys.stdout.write(f"\r[WATCHING] {mins:02d}:{secs:02d} | Chat: {rate:.1f} msg/10s | Audio: {data.get('audio_level'):.1f} dB   ")
            sys.stdout.flush()

    stream_manager.register_broadcast_callback(on_event)

    try:
        while stream_manager.is_running:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\n\n[INFO] Detaching from stream...")
        await stream_manager.stop_stream()
        print("[INFO] Stream watcher stopped cleanly.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: ./watch.sh <STREAM_URL_OR_DEMO>")
        print("Examples:")
        print("  ./watch.sh https://www.youtube.com/watch?v=live_stream_id")
        print("  ./watch.sh https://kick.com/xqc")
        print("  ./watch.sh demo")
        sys.exit(1)

    url = sys.argv[1]
    asyncio.run(run_watcher(url))
