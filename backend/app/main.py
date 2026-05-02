from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models
from app.detection.face_detector import FaceDetector
from app.services.stream_manager import StreamManager
from app.routers import stream, feed, roi  # Added 'roi'

# Initialize singletons
face_detector = FaceDetector()
stream_manager = StreamManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    app.state.face_detector = face_detector
    app.state.stream_manager = stream_manager

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # --- SHUTDOWN ---
    face_detector.close()
    await engine.dispose()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(stream.router)
app.include_router(feed.router)
app.include_router(roi.router)   # Added roi router here


@app.get("/health")
async def health_check():
    return {"status": "ok"}