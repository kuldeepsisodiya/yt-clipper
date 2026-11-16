import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.config import BASE_DIR, DATA_DIR
from backend import database
from backend.api.routes import router as api_router
from backend.api.websocket import ws_manager
from backend.engine.stream_manager import stream_manager
from backend.engine.clipper import video_clipper
from backend.engine.simulator import simulator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    database.init_db()
    video_clipper.start_worker()
    
    # Wire stream manager broadcast to WebSockets
    stream_manager.register_broadcast_callback(ws_manager.broadcast)
    
    # Auto-initialize demo simulation if database has no streams
    current = database.get_current_stream()
    if not current:
        latest = database.get_latest_stream()
        if not latest:
            asyncio.create_task(simulator.start())
            # Trigger 2 sample scenarios so user opens dashboard with real data ready!
            asyncio.create_task(_seed_initial_highlights())

    yield

    # Shutdown
    if simulator.is_running:
        await simulator.stop()
    if stream_manager.is_running:
        await stream_manager.stop_stream()

async def _seed_initial_highlights():
    await asyncio.sleep(2.0)
    try:
        await simulator.trigger_highlight_scenario(0) # Police Chase
        await asyncio.sleep(2.0)
        await simulator.trigger_highlight_scenario(1) # Crash
    except Exception as e:
        pass

app = FastAPI(
    title="VICE CLIPS API",
    description="Automated GTA VI Livestream Highlight Detection & Clipping Studio",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection open and receive optional ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
