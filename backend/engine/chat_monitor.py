import time
import re
import statistics
from collections import deque
from typing import List, Dict, Tuple, Optional, Any

class ChatMessage:
    def __init__(self, author: str, text: str, timestamp_offset: float):
        self.author = author
        self.text = text
        self.timestamp_offset = timestamp_offset

class ChatMonitor:
    def __init__(
        self,
        bucket_seconds: int = 10,
        baseline_window_seconds: int = 180,
        spike_threshold: float = 2.5,
        min_messages: int = 5,
        cooldown_seconds: int = 30
    ):
        self.bucket_seconds = bucket_seconds
        self.baseline_window_seconds = baseline_window_seconds
        self.spike_threshold = spike_threshold
        self.min_messages = min_messages
        self.cooldown_seconds = cooldown_seconds

        # Internal state
        self.history: deque = deque()  # list of ChatMessage
        self.buckets: deque = deque()  # (bucket_timestamp, message_count, reaction_count, texts)
        self.last_spike_timestamp: float = -999.0
        self.current_bucket_start: float = 0.0
        self.current_bucket_messages: List[ChatMessage] = []

        # Reaction / Sentiment vocabulary
        self.reaction_patterns = [
            r"\b(lol|lmao|lmfao|rofl|kekw|dead|hah+a+)\b",
            r"\b(wtf|wth|omg|bruh|brooo+|no way|holy|yo+)\b",
            r"\b(w|l|pog|poggers|sheesh|insane|wild|cooked|clip it)\b",
            r"\b(5 star|cops|police|feds|busted|wasted)\b"
        ]
        self.reaction_regex = re.compile("|".join(self.reaction_patterns), re.IGNORECASE)

    def reconfigure(
        self,
        bucket_seconds: Optional[int] = None,
        baseline_window_seconds: Optional[int] = None,
        spike_threshold: Optional[float] = None,
        min_messages: Optional[int] = None,
        cooldown_seconds: Optional[int] = None
    ):
        if bucket_seconds is not None:
            self.bucket_seconds = bucket_seconds
        if baseline_window_seconds is not None:
            self.baseline_window_seconds = baseline_window_seconds
        if spike_threshold is not None:
            self.spike_threshold = spike_threshold
        if min_messages is not None:
            self.min_messages = min_messages
        if cooldown_seconds is not None:
            self.cooldown_seconds = cooldown_seconds

    def add_message(self, author: str, text: str, timestamp_offset: float) -> Optional[Dict[str, Any]]:
        """
        Adds a message to the stream.
        Returns a spike detection dict if a highlight trigger was tripped, otherwise None.
        """
        msg = ChatMessage(author, text, timestamp_offset)
        self.history.append(msg)

        # Initialize current bucket start if first message
        if not self.current_bucket_start:
            self.current_bucket_start = timestamp_offset

        # Check if current bucket has closed
        if timestamp_offset - self.current_bucket_start >= self.bucket_seconds:
            spike_event = self._close_current_bucket(timestamp_offset)
            self.current_bucket_start = timestamp_offset
            self.current_bucket_messages = [msg]
            return spike_event
        else:
            self.current_bucket_messages.append(msg)
            return None

    def _close_current_bucket(self, current_time: float) -> Optional[Dict[str, Any]]:
        count = len(self.current_bucket_messages)
        reaction_count = 0
        all_texts = []
        for m in self.current_bucket_messages:
            all_texts.append(m.text)
            if self.reaction_regex.search(m.text):
                reaction_count += 1

        self.buckets.append((self.current_bucket_start, count, reaction_count, all_texts))

        # Evict old buckets outside baseline window
        cutoff = current_time - self.baseline_window_seconds
        while self.buckets and self.buckets[0][0] < cutoff:
            self.buckets.popleft()

        # Compute baseline median of past message counts (excluding current bucket)
        past_counts = [b[1] for b in list(self.buckets)[:-1]]
        if not past_counts:
            baseline = max(1.0, float(count))
        else:
            baseline = max(1.0, float(statistics.median(past_counts)))

        # Spike detection check
        ratio = count / baseline
        reaction_density = reaction_count / max(1, count)

        is_spike = (
            count >= self.min_messages and
            ratio >= self.spike_threshold and
            (current_time - self.last_spike_timestamp) >= self.cooldown_seconds
        )

        if is_spike:
            self.last_spike_timestamp = current_time
            # Analyze repeated keywords and top phrases
            sample_keywords = self._extract_dominant_phrases(all_texts)
            return {
                "timestamp_offset": self.current_bucket_start,
                "count": count,
                "baseline": baseline,
                "spike_ratio": round(ratio, 2),
                "reaction_density": round(reaction_density, 2),
                "sample_keywords": sample_keywords,
                "sample_messages": all_texts[:8],
            }

        return None

    def _extract_dominant_phrases(self, texts: List[str]) -> List[str]:
        words = []
        for t in texts:
            # normalize words
            cleaned = re.findall(r"\b[A-Za-z0-9_]{3,}\b", t.upper())
            words.extend(cleaned)
        
        freq: Dict[str, int] = {}
        for w in words:
            if w not in ["THE", "AND", "THAT", "THIS", "WITH", "JUST", "LIKE"]:
                freq[w] = freq.get(w, 0) + 1

        sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        return [w for w, count in sorted_words[:5]]

    def get_current_stats(self, current_time: float) -> Tuple[float, float]:
        """Returns (current_rate_per_10s, baseline)"""
        current_count = len(self.current_bucket_messages)
        past_counts = [b[1] for b in self.buckets]
        if not past_counts:
            baseline = max(1.0, float(current_count))
        else:
            baseline = max(1.0, float(statistics.median(past_counts)))
        return float(current_count), baseline
