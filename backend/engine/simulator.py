import os
import time
import random
import asyncio
import subprocess
import logging
from typing import Optional, List, Dict, Any
from backend.config import RECORDINGS_DIR, settings
from backend import database
from backend.models import GTAEventCategory
from backend.engine.stream_manager import stream_manager
from backend.engine.clipper import video_clipper

logger = logging.getLogger("vice_clips.simulator")

SIMULATED_STREAM_ID = "stream_gtavi_live_demo"

SIMULATED_CHATTERS = [
    "ViceCityViper", "LuciaMain_99", "JasonDrifter", "StarryNight",
    "GamerProX", "NeonRider", "LeonidaNative", "OceanDriveBoy",
    "Gta6HypeTrain", "SpeedyGonzales", "SwatOfficerDave", "KevInVice"
]

SIMULATED_SCENARIOS = [
    {
        "category": GTAEventCategory.POLICE_CHASE,
        "texts": [
            "BRO THE COPS ARE ON HIM", "5 STARS INCOMING!!", "PIT MANEUVER THAT CRUISER",
            "HE JUMPED OVER THE HIGHWAY BARRIER", "NO WAY HE ESCAPED THE HELI",
            "COPS CRASHED INTO EACH OTHER LMAOO", "WTF ARE THESE POLICE PHYSICS",
            "BEST CHASE EVER DEAD", "W ESCAPE", "CLIP IT RN!!"
        ],
        "speech": "I've got three cruisers on my tail! Taking the bridge into Vice Port!",
        "audio_db": -9.5,
        "spike_ratio": 4.2,
        "title": "Insane 5-Cruiser Police Pursuit on Ocean Drive"
    },
    {
        "category": GTAEventCategory.VEHICLE_CRASH,
        "texts": [
            "BRO HE FLEW OUT THE WINDSHIELD", "LMFAOOOO", "RAGDOLL MOMENT",
            "THE CAR SPLIT IN HALF WTFFFF", "DID YOU SEE THAT BARREL ROLL??",
            "HE BOUNCED OFF THREE PALM TREES", "DEAD", "GTA 6 PHYSICS GOING CRAZY",
            "NO AIRBAGS IN VICE CITY", "HAHAHAHAHA"
        ],
        "speech": "Look at this ramp— OH NO NO NO HIT THE TREE!",
        "audio_db": -7.2,
        "spike_ratio": 3.8,
        "title": "Supercar Barrel Roll & Tree Collision Ragdoll"
    },
    {
        "category": GTAEventCategory.FUNNY_NPC,
        "texts": [
            "DID THAT NPC JUST THROW A FLAMINGO AT HIM??", "LMAOOOO WHAT DID BRO SAY",
            "VICE CITY PEDESTRIANS HAVE NO CHILL", "THE VOICE LINES ARE UNREAL",
            "HE WALKED STRAIGHT INTO THE CANAL", "NPC OF THE YEAR", "IM CRYING",
            "BRO SAID WHAT???", "AI PEDESTRIANS BE WILDIN", "ROFL"
        ],
        "speech": "Wait listen to what this guy on the sidewalk is saying to Lucia!",
        "audio_db": -16.0,
        "spike_ratio": 3.1,
        "title": "Unfiltered NPC Encounter Outside Starfish Island Club"
    },
    {
        "category": GTAEventCategory.SHOOTOUT_COMBAT,
        "texts": [
            "THAT HEADSHOT WAS CRISP", "AIMBOT ON LOCK", "RPG FIRED AT THE SWAT VAN",
            "HE WIPED OUT THE WHOLE SQUAD SOLO", "SNIPER FROM THE ROOFTOP",
            "SHEESH THAT REACTION TIME", "W GUNPLAY", "THE LIGHTING AT NIGHT IS NUTS",
            "COMBAT LOOKS SO CLEAN", "HEAVY ARTILLERY"
        ],
        "speech": "Swapping to the tactical carbine! Flanking behind the fountain!",
        "audio_db": -11.0,
        "spike_ratio": 3.6,
        "title": "Midnight Marina Shootout with Cartel Enforcers"
    },
    {
        "category": GTAEventCategory.VEHICLE_STUNT,
        "texts": [
            "CLEANEST JUMP OFF THE DRAWBRIDGE", "HE ACTUALLY LANDED THAT??", "W DRIVING",
            "AIRTIME FOR DAYS", "SUPERCAR AIR DRIFT", "STUNT BONUS PASS",
            "HOW DID THE TIRES SURVIVE", "NUTS", "CLIP THIS MAN"
        ],
        "speech": "Hitting the opening drawbridge at 160 MPH! Hold on!",
        "audio_db": -12.5,
        "spike_ratio": 3.4,
        "title": "160 MPH Drawbridge Stunt Jump over Biscayne Bay"
    }
]

class StreamSimulator:
    def __init__(self):
        self.is_running = False
        self.simulation_task: Optional[asyncio.Task] = None
        self.sample_media_path = str(RECORDINGS_DIR / "simulated_stream.mp4")

    def ensure_sample_media(self):
        """Generates a 60-second test video if not already present."""
        if not os.path.exists(self.sample_media_path) or os.path.getsize(self.sample_media_path) < 10000:
            logger.info("Generating synthetic 60s GTA VI demo video with FFmpeg...")
            cmd = [
                "ffmpeg", "-y",
                "-f", "lavfi",
                "-i", "testsrc=duration=60:size=1920x1080:rate=30",
                "-f", "lavfi",
                "-i", "sine=frequency=320:duration=60",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-c:a", "aac",
                "-pix_fmt", "yuv420p",
                self.sample_media_path
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logger.info(f"Generated demo video: {self.sample_media_path}")

    async def start(self):
        if self.is_running:
            return

        self.ensure_sample_media()
        self.is_running = True

        database.init_db()
        stream = database.create_stream(
            stream_id=SIMULATED_STREAM_ID,
            youtube_url="https://youtube.com/watch?v=gta6_vice_city_live",
            title="GTA VI — Vice City Coastline Live Beta Stream",
            channel_name="Vice City Gaming Studio",
            thumbnail_url="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            status="simulating"
        )
        stream_manager.active_stream_id = SIMULATED_STREAM_ID
        stream_manager.current_recording_path = self.sample_media_path
        stream_manager.start_time = time.time()
        video_clipper.start_worker()

        self.simulation_task = asyncio.create_task(self._simulation_loop())
        logger.info("Simulator started successfully")

    async def stop(self):
        self.is_running = False
        if self.simulation_task:
            self.simulation_task.cancel()
            self.simulation_task = None
        database.update_stream_status(SIMULATED_STREAM_ID, "stopped")
        if stream_manager.active_stream_id == SIMULATED_STREAM_ID:
            stream_manager.active_stream_id = None
        logger.info("Simulator stopped")

    async def trigger_highlight_scenario(self, scenario_index: Optional[int] = None) -> str:
        """Manually or automatically triggers one of the GTA VI scenarios."""
        self.ensure_sample_media()
        if scenario_index is not None and 0 <= scenario_index < len(SIMULATED_SCENARIOS):
            scen = SIMULATED_SCENARIOS[scenario_index]
        else:
            scen = random.choice(SIMULATED_SCENARIOS)

        offset = time.time() - stream_manager.start_time if stream_manager.start_time else 35.0
        # Feed chat messages to monitor
        for txt in scen["texts"]:
            author = random.choice(SIMULATED_CHATTERS)
            stream_manager.chat_monitor.add_message(author, txt, offset)

        # Infer category and compute highlight score
        category, det_type, conf = stream_manager.event_detector.infer_category(scen["texts"], scen["speech"])
        score, reasons = stream_manager.event_detector.calculate_highlight_score(
            chat_spike_ratio=scen["spike_ratio"],
            reaction_density=0.75,
            audio_level_db=scen["audio_db"],
            has_excited_speech=True,
            is_manual_marker=False
        )

        highlight_id = database.insert_highlight(
            stream_id=SIMULATED_STREAM_ID,
            timestamp_offset=round(offset, 1),
            category=category.value,
            score=score,
            reasons=reasons,
            chat_rate=float(len(scen["texts"]) * 2.5),
            audio_level=scen["audio_db"],
            speech_text=scen["speech"],
            duration_sec=30.0,
            detection_type=det_type,
            status="Processing"
        )

        # Enqueue clip generation
        video_clipper.enqueue_clip_generation(
            stream_id=SIMULATED_STREAM_ID,
            highlight_id=highlight_id,
            source_media_path=self.sample_media_path,
            start_time_sec=max(0.0, offset % 30),
            duration_sec=30.0,
            title=scen["title"],
            crop_position=settings.default_crop_position,
            burn_subtitles=settings.burn_subtitles_default,
            subtitle_style=settings.subtitle_style,
            speech_text=scen["speech"]
        )

        # Log activity point with highlight
        database.log_activity(
            stream_id=SIMULATED_STREAM_ID,
            timestamp_offset=round(offset, 1),
            chat_rate=float(len(scen["texts"]) * 2.5),
            audio_level=scen["audio_db"],
            baseline=5.0,
            has_highlight=True,
            highlight_category=category.value,
            highlight_score=score
        )

        await stream_manager.broadcast_event("highlight_detected", {
            "id": highlight_id,
            "stream_id": SIMULATED_STREAM_ID,
            "category": category.value,
            "score": score,
            "reasons": reasons,
            "offset": round(offset, 1),
            "title": scen["title"]
        })

        return highlight_id

    async def _simulation_loop(self):
        """Continuously feeds simulated pulses and occasional scenario highlights."""
        seconds_since_highlight = 0
        while self.is_running:
            try:
                offset = time.time() - stream_manager.start_time
                normal_rate = random.uniform(3.0, 7.5)
                normal_db = random.uniform(-32.0, -26.0)

                # Feed a normal chatter
                chatter = random.choice(SIMULATED_CHATTERS)
                normal_phrases = ["hyped for launch", "graphics look unreal", "driving is so smooth", "look at the water reflections", "lucia is badass"]
                stream_manager.chat_monitor.add_message(chatter, random.choice(normal_phrases), offset)

                database.log_activity(
                    stream_id=SIMULATED_STREAM_ID,
                    timestamp_offset=round(offset, 1),
                    chat_rate=round(normal_rate, 1),
                    audio_level=round(normal_db, 1),
                    baseline=5.0,
                    has_highlight=False
                )

                await stream_manager.broadcast_event("stream_pulse", {
                    "stream_id": SIMULATED_STREAM_ID,
                    "timestamp_offset": round(offset, 1),
                    "chat_rate": round(normal_rate, 1),
                    "baseline": 5.0,
                    "audio_level": round(normal_db, 1)
                })

                seconds_since_highlight += 3
                # Trigger a highlight every 45-60 seconds automatically if in demo mode
                if seconds_since_highlight >= 50:
                    seconds_since_highlight = 0
                    await self.trigger_highlight_scenario()

                await asyncio.sleep(3.0)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulator loop: {e}")
                await asyncio.sleep(3.0)

simulator = StreamSimulator()
