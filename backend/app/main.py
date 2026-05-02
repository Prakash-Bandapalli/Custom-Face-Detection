from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models
from app.detection.face_detector import FaceDetector
from app.services.stream_manager import StreamManager
from app.routers import stream, feed  # Added 'feed' here

# Initialize singletons
face_detector = FaceDetector()
stream_manager = StreamManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    # Attach singletons to app state so routers can access them
    app.state.face_detector = face_detector
    app.state.stream_manager = stream_manager

    # Create database tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # --- SHUTDOWN ---
    face_detector.close()
    await engine.dispose()


# Create the FastAPI app
app = FastAPI(lifespan=lifespan)

# Enable CORS so the React frontend can talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(stream.router)
app.include_router(feed.router)   # Added feed router here


@app.get("/health")
async def health_check():
    return {"status": "ok"}