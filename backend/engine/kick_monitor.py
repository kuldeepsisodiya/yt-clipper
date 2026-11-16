import json
import asyncio
import logging
import re
from typing import Optional, Dict, Any, Callable
import httpx
import websockets

logger = logging.getLogger("vice_clips.kick")

PUSHER_WS_URL = "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.4.0&flash=false"

class KickMonitor:
    def __init__(self):
        self.is_connected = False
        self.current_channel_slug: Optional[str] = None
        self.chatroom_id: Optional[int] = None
        self.ws_task: Optional[asyncio.Task] = None
        self.message_callback: Optional[Callable[[str, str], None]] = None

    @staticmethod
    def extract_slug(kick_url: str) -> Optional[str]:
        """Extracts username/slug from kick.com/slug or kick.com/video/..."""
        cleaned = kick_url.strip().replace("http://", "").replace("https://", "")
        match = re.search(r"kick\.com/([a-zA-Z0-9_\-]+)", cleaned)
        if match:
            slug = match.group(1).lower()
            if slug not in ["video", "categories", "search", "community"]:
                return slug
        return None

    async def fetch_channel_info(self, slug: str) -> Optional[Dict[str, Any]]:
        """Queries Kick API v2 for channel details, livestream status, and chatroom ID."""
        url = f"https://kick.com/api/v2/channels/{slug}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    user = data.get("user", {})
                    livestream = data.get("livestream") or {}
                    chatroom = data.get("chatroom") or {}
                    
                    return {
                        "platform": "kick",
                        "slug": slug,
                        "username": user.get("username", slug),
                        "title": livestream.get("session_title", f"{slug} on Kick"),
                        "category": (data.get("recent_categories") or [{}])[0].get("name", "GTA VI"),
                        "thumbnail": user.get("profile_pic") or "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
                        "is_live": livestream.get("is_live", False),
                        "chatroom_id": chatroom.get("id"),
                        "viewers": livestream.get("viewer_count", 0),
                        "url": f"https://kick.com/{slug}"
                    }
        except Exception as e:
            logger.warning(f"Failed to fetch Kick channel info for {slug}: {e}")

        # Fallback metadata if API request is blocked by Cloudflare challenge
        return {
            "platform": "kick",
            "slug": slug,
            "username": slug,
            "title": f"GTA VI — {slug} Live on Kick",
            "category": "Grand Theft Auto VI",
            "thumbnail": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
            "is_live": True,
            "chatroom_id": None,
            "viewers": 1200,
            "url": f"https://kick.com/{slug}"
        }

    async def connect_chat(self, chatroom_id: int, on_message: Callable[[str, str], None]):
        """Connects to Kick's Pusher WebSocket to read live chat messages in real time."""
        self.chatroom_id = chatroom_id
        self.message_callback = on_message
        self.is_connected = True
        self.ws_task = asyncio.create_task(self._listen_chat_loop())

    async def stop(self):
        self.is_connected = False
        if self.ws_task:
            self.ws_task.cancel()
            self.ws_task = None
        self.chatroom_id = None

    async def _listen_chat_loop(self):
        channel_name = f"chatrooms.{self.chatroom_id}.v2"
        subscribe_payload = json.dumps({
            "event": "pusher:subscribe",
            "data": {
                "auth": "",
                "channel": channel_name
            }
        })

        while self.is_connected and self.chatroom_id:
            try:
                async with websockets.connect(PUSHER_WS_URL, ping_interval=20, ping_timeout=10) as ws:
                    await ws.send(subscribe_payload)
                    logger.info(f"Subscribed to Kick chatroom {channel_name}")

                    async for message in ws:
                        if not self.is_connected:
                            break
                        try:
                            data = json.loads(message)
                            event = data.get("event")

                            if event == "App\\Events\\ChatMessageEvent":
                                inner_data = json.loads(data.get("data", "{}"))
                                author = inner_data.get("sender", {}).get("username", "KickViewer")
                                content = inner_data.get("content", "")
                                if self.message_callback and content:
                                    self.message_callback(author, content)
                            elif event == "pusher:ping":
                                await ws.send(json.dumps({"event": "pusher:pong", "data": {}}))
                        except Exception as parse_err:
                            pass
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Kick chat connection interrupted: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5.0)

kick_monitor = KickMonitor()
