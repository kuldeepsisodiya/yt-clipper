# VICE CLIPS
> *Capture the chaos. Keep the moments.*
> **Automated GTA VI Livestream Highlight Detection & Clipping Studio**

VICE CLIPS is a high-performance creative studio specifically optimized for GTA VI content creators, gaming YouTubers, and short-form video editors (YouTube Shorts, TikTok, Instagram Reels).

Instead of relying solely on chat spikes, VICE CLIPS implements a modular, multi-signal highlight detection engine combining chat velocity, sentiment density, audio peak energy, speech transcription, and creator markers.

---

## Key Features

- **Multi-Platform Livestream Ingestion**:
  - **YouTube Live**: Full chat spike analysis and rolling recording buffer.
  - **Kick.com**: Real-time Pusher WebSocket chatroom monitoring, channel discovery, and stream capture.
- **GTA VI Event Recognition**: 15 distinct categories (Police Chases, 5-Star Wanted levels, Shootouts, Stunts, Vehicle Crashes, NPC interactions, Glitches, Ragdoll physics, etc.).
- **Transparent Multi-Signal Scoring (0–100)**:
  - Chat spike velocity (10s buckets, 3-minute rolling median comparison).
  - Reaction & sentiment concentration (LOL, WTF, OMG, DEAD, NO WAY).
  - Audio RMS energy decibel analysis (loud reactions, sound peaks).
  - Speech excitement patterns & Whisper transcription.
  - Creator markers.
- **Viral Short-Form Subtitle Studio**:
  - Dynamic active word pop & karaoke highlighting.
  - 4 Viral Subtitle Aesthetics: *Viral Pop* (CapCut/Shorts style with neon pop), *Vice Pill* (glowing neon badge), *Bold Outline* (classic gaming stroke), and *Cinematic*.
  - Live caption text editor with custom highlight accent colors (#FFE600 Viral Yellow, #FF795F Vice Coral, #00F0FF Cyber Cyan, #75D6A0 Neon Mint).
  - Flexible positioning: Top, Center, Bottom (15% to 85% height) and font size scales (S, M, L, XL).
  - Both `.srt` and Advanced SubStation Alpha (`.ass`) output generation.
- **Automated Video Processing & Clipping**:
  - H.264 MP4 export with strict audio/video synchronization.
  - Vertical 9:16 portrait formatting (1080x1920) with configurable horizontal crop tracking.
  - Preserved original 16:9 landscape exports.
  - SRT subtitle generation & customizable subtitle burning (Clean White, Bold Gaming, Minimal Cinematic).
  - Background asynchronous task queue.
- **Apple-Inspired Cinematic Design System**:
  - Apple macOS / visionOS glass styling with CSS `linear()` spring physics.
  - Vice City dark atmosphere with coral sunset (`#FF795F`) and muted lavender (`#A99AEF`) accents.
  - Space Grotesk display headings and Inter interface typography.
- **Built-in GTA VI Livestream Simulator**:
  - Production-ready demo mode with synthetic video generation, real-time chat feed, audio meters, and live highlight generation for zero-friction testing.

---

## Quick Start

### 1. Run Setup
```bash
./setup.sh
```
This automatically verifies FFmpeg, creates the Python virtual environment (`.venv`), installs backend dependencies, and builds the frontend.

### 2. Launch the Studio Dashboard
```bash
./dashboard.sh
```
- **Studio Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Headless Stream Watcher (CLI)
To attach directly to a live YouTube stream or run headless monitoring:
```bash
./watch.sh <YOUTUBE_URL>

# Or run in demo simulation mode:
./watch.sh demo
```

---

## Studio Architecture

```
yt-clipper/
├── backend/
│   ├── api/
│   │   ├── routes.py          # REST endpoints (Stream, Highlights, Clips, Analytics, Media)
│   │   └── websocket.py       # Real-time WebSocket connection manager
│   ├── engine/
│   │   ├── chat_monitor.py    # 10s buckets, 3m baseline, spike ratio & sentiment engine
│   │   ├── event_detector.py  # 15 GTA VI categories, multi-signal scoring (0-100)
│   │   ├── audio_analyzer.py  # FFmpeg volumedetect & Whisper integration
│   │   ├── clipper.py         # FFmpeg trimming, 9:16 vertical crop, SRT subtitle generation
│   │   ├── stream_manager.py  # Rolling recording buffer management
│   │   └── simulator.py       # High-fidelity GTA VI demo simulation engine
│   ├── config.py              # Tunable thresholds & scoring weights
│   ├── database.py            # SQLite persistent metadata engine
│   ├── models.py              # Pydantic schemas & enums
│   ├── watch.py               # Headless CLI watcher script
│   └── tests/
│       └── test_vice_clips.py # Unit tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx            # Collapsible navigation with connection indicators
│   │   │   ├── CommandBar.tsx         # Top bar with Cmd+K search & stream pills
│   │   │   ├── Overview.tsx           # Hero KPI, Stream Activity chart, Highlights table
│   │   │   ├── LiveMonitor.tsx        # Live player, velocity gauges, audio meter, marker drop
│   │   │   ├── HighlightsExplorer.tsx # Card grid with category filters & scoring breakdown
│   │   │   ├── ClipEditor.tsx         # Video player, trimming, 9:16 crop slider, subtitle styling
│   │   │   ├── ClipsLibrary.tsx       # Media library, video player modal, MP4 downloads
│   │   │   ├── RecordingsView.tsx     # Rolling buffer storage management
│   │   │   ├── AnalyticsView.tsx      # Performance metrics & category distributions
│   │   │   ├── SettingsModal.tsx      # Configurable detection sliders & weights
│   │   │   ├── HighlightDetailModal.tsx # Multi-signal explanation breakdown modal
│   │   │   ├── SearchModal.tsx        # Cmd+K Quick command palette
│   │   │   └── Toast.tsx              # Tactile toast notification stack
│   │   ├── services/api.ts            # Type-safe API client
│   │   ├── hooks/useWebSocket.ts      # Live pulse & highlight WebSocket hook
│   │   └── types/index.ts             # TypeScript definitions
├── setup.sh                   # Environment setup script
├── dashboard.sh               # Dual-service dev runner
├── watch.sh                   # Headless livestream watcher CLI
└── requirements.txt           # Pinned Python requirements
```

---

## Testing

Run the test suite:
```bash
source .venv/bin/activate
PYTHONPATH=. pytest backend/tests/test_vice_clips.py -v
```
