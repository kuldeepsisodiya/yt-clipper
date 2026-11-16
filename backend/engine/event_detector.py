import re
from typing import Dict, List, Optional, Tuple, Any
from backend.models import GTAEventCategory
from backend.config import settings

class EventDetector:
    def __init__(self, config_settings=None):
        self.settings = config_settings or settings
        
        # GTA VI keyword mapping for category inference
        self.category_lexicons = {
            GTAEventCategory.FIVE_STAR_WANTED: [
                r"\b(5 star|five star|military|tank|swat team|armored|maximum wanted)\b"
            ],
            GTAEventCategory.POLICE_CHASE: [
                r"\b(cops|police|feds|sirens|chase|chasing|pursuit|evading|pit maneuver|busted|lost the cops)\b"
            ],
            GTAEventCategory.SHOOTOUT_COMBAT: [
                r"\b(headshot|aimbot|gunfight|shootout|sniper|rpg|bazooka|combat|wasted|laser|firefight)\b"
            ],
            GTAEventCategory.VEHICLE_CRASH: [
                r"\b(crash|flew off|wrecked|totaled|flipped|car into wall|into a tree|demolished)\b"
            ],
            GTAEventCategory.VEHICLE_THEFT_ESCAPE: [
                r"\b(jacked|stole|grand theft|stolen supercar|getaway|escape vehicle|hijacked)\b"
            ],
            GTAEventCategory.EXPLOSION: [
                r"\b(boom|explosion|blew up|gas station|detonate|c4|grenade|air strike|combustion)\b"
            ],
            GTAEventCategory.FUNNY_NPC: [
                r"\b(npc|npc dialogue|bro said|pedestrian|npc reaction|ai is crazy|voice line|npc walked into)\b"
            ],
            GTAEventCategory.UNEXPECTED_GLITCH: [
                r"\b(glitch|bug|t-pose|fell through the map|teleported|stretched|desync|texture bug)\b"
            ],
            GTAEventCategory.RAGDOLL_PHYSICS: [
                r"\b(ragdoll|flew into space|physics engine|bounced|launch|sent to heaven|somersault)\b"
            ],
            GTAEventCategory.RARE_ENCOUNTER: [
                r"\b(secret|easter egg|ufo|rare car|legendary|hidden spot|alligator|jason and lucia secret)\b"
            ],
            GTAEventCategory.MISSION_COMPLETION: [
                r"\b(mission passed|completed|heist complete|score|payday|gold medal|cutscene)\b"
            ],
            GTAEventCategory.STORY_MOMENT: [
                r"\b(lucia|jason|plot twist|story cutscene|betrayal|voice actor|lore|ending)\b"
            ],
            GTAEventCategory.VEHICLE_STUNT: [
                r"\b(stunt|jump|ramp|barrel roll|insane stunt|clean land|trick|wheelie)\b"
            ],
            GTAEventCategory.HIGH_SPEED_DRIVING: [
                r"\b(200 mph|speeding|drift|threading the needle|highway weave|supercar speed|slipstream)\b"
            ],
            GTAEventCategory.STREAMER_REACTION: [
                r"\b(screaming|laughing|crying|omg|bruh|no way|dead|chill|yo+|what just happened)\b"
            ]
        }

    def infer_category(
        self,
        chat_texts: List[str],
        speech_text: Optional[str] = None
    ) -> Tuple[GTAEventCategory, str, float]:
        """
        Infers the GTA VI event category based on keyword signals.
        Returns: (category, detection_type, confidence_score_0_to_1)
        """
        corpus = " ".join(chat_texts)
        if speech_text:
            corpus += " " + speech_text

        best_category = GTAEventCategory.STREAMER_REACTION
        highest_matches = 0

        for cat, patterns in self.category_lexicons.items():
            matches = 0
            for pat in patterns:
                found = len(re.findall(pat, corpus, re.IGNORECASE))
                matches += found
            
            if matches > highest_matches:
                highest_matches = matches
                best_category = cat

        if highest_matches >= 3:
            return best_category, "inferred", min(1.0, 0.5 + (highest_matches * 0.1))
        elif highest_matches >= 1:
            return best_category, "inferred", 0.45
        else:
            # Insufficient specific evidence - do not falsely fabricate a specific GTA event!
            return GTAEventCategory.STREAMER_REACTION, "detected", 0.35

    def calculate_highlight_score(
        self,
        chat_spike_ratio: float,
        reaction_density: float,
        audio_level_db: float,
        has_excited_speech: bool,
        is_manual_marker: bool = False,
        weights: Optional[Dict[str, float]] = None
    ) -> Tuple[int, List[str]]:
        """
        Calculates a score between 0 and 100 with clear human-readable reasons.
        Weights default to:
          chat_spike: 35%
          chat_sentiment: 20%
          audio_intensity: 20%
          speech_excitement: 15%
          metadata/manual: 10%
        """
        w = weights or {
            "chat_spike": self.settings.weight_chat_spike,
            "chat_sentiment": self.settings.weight_sentiment if hasattr(self.settings, 'weight_sentiment') else 0.20,
            "audio_intensity": self.settings.weight_audio_intensity,
            "speech_excitement": self.settings.weight_speech_excitement,
            "manual_metadata": self.settings.weight_manual_metadata
        }

        reasons = []

        # 1. Chat spike component (0 - 100)
        # Spike ratio 1.0 = 0, 2.5 = 60, 4.0+ = 100
        spike_comp = min(100.0, max(0.0, (chat_spike_ratio - 1.0) / 3.0 * 100.0))
        if chat_spike_ratio >= 3.5:
            reasons.append(f"Chat spike: Extreme ({chat_spike_ratio:.1f}x baseline velocity)")
        elif chat_spike_ratio >= 2.5:
            reasons.append(f"Chat spike: Very high ({chat_spike_ratio:.1f}x baseline)")
        elif chat_spike_ratio >= 1.8:
            reasons.append(f"Chat activity: Elevated ({chat_spike_ratio:.1f}x baseline)")

        # 2. Chat sentiment / reaction density (0 - 100)
        sentiment_comp = min(100.0, reaction_density * 130.0)
        if reaction_density >= 0.5:
            reasons.append(f"Viewer sentiment: Overwhelming excitement ({int(reaction_density*100)}% reaction density)")
        elif reaction_density >= 0.25:
            reasons.append(f"Viewer sentiment: High concentration of LOL/WTF reactions")

        # 3. Audio intensity component (0 - 100)
        # Audio level: -45 dB is quiet, -15 dB is loud peak, -5 dB is clipping/screaming
        # Normalize -45 -> 0, -10 -> 100
        audio_norm = min(100.0, max(0.0, (audio_level_db + 45.0) / 35.0 * 100.0))
        if audio_level_db >= -12.0:
            reasons.append(f"Audio energy: Peak volume trigger ({audio_level_db:.1f} dB)")
        elif audio_level_db >= -20.0:
            reasons.append(f"Audio energy: Noticeable volume surge ({audio_level_db:.1f} dB)")

        # 4. Speech excitement (0 or 100)
        speech_comp = 100.0 if has_excited_speech else 20.0
        if has_excited_speech:
            reasons.append("Speech pattern: Excited streamer voice detected")

        # 5. Manual / Metadata marker
        manual_comp = 100.0 if is_manual_marker else 0.0
        if is_manual_marker:
            reasons.append("Creator intent: Manually marked highlight")

        # Calculate weighted composite
        composite = (
            spike_comp * w.get("chat_spike", 0.35) +
            sentiment_comp * w.get("chat_sentiment", 0.20) +
            audio_norm * w.get("audio_intensity", 0.20) +
            speech_comp * w.get("speech_excitement", 0.15) +
            manual_comp * w.get("manual_metadata", 0.10)
        )

        final_score = int(min(100, max(15, round(composite))))
        if not reasons:
            reasons.append("Multi-signal threshold met")

        return final_score, reasons
