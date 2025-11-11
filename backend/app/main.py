from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
import asyncio
import logging
from typing import Set
from app.config import settings
from app.database import engine, Base, get_redis
import redis.asyncio as redis
from app.routers import auth, dreams, moments, upload

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        """Broadcast to all connected clients"""
        for connection in self.active_connections.copy():
            try:
                await connection.send_json(message)
            except Exception:
                self.active_connections.discard(connection)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start Redis listener for moments stream
    asyncio.create_task(redis_listener())

    yield

    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="DreamCapture API",
    description="Where dreams become moments",
    version="0.1.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for better error tracking
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.DEBUG else "An error occurred"
        }
    )


# Include routers
app.include_router(auth.router)
app.include_router(dreams.router)
app.include_router(moments.router)
app.include_router(upload.router)

# Mount static files for uploads
STATIC_DIR = Path("/var/www/dreamcapture/backend/static")
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(STATIC_DIR / "uploads")), name="uploads")


@app.get("/")
async def root():
    return {
        "name": "DreamCapture API",
        "version": "0.1.0",
        "status": "running",
        "ai_enabled": settings.ENABLE_AI_FEATURES
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# WebSocket endpoint for real-time stream
@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """Real-time stream of moments"""
    await manager.connect(websocket)

    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def redis_listener():
    """Listen to Redis pub/sub for new moments and broadcast via WebSocket"""
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

    try:
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("moments_stream")
        logger.info("Redis listener started for moments_stream")

        async for message in pubsub.listen():
            if message["type"] == "message":
                # Broadcast to all WebSocket clients
                await manager.broadcast({
                    "type": "new_moment",
                    "data": message["data"]
                })
                logger.debug(f"Broadcasted new moment to {len(manager.active_connections)} clients")

    except Exception as e:
        logger.error(f"Redis listener error: {e}", exc_info=True)
    finally:
        await redis_client.aclose()
        logger.info("Redis listener stopped")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
