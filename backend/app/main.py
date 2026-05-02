from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import engine, Base
from app import models


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    # Creates database tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # --- SHUTDOWN ---
    await engine.dispose()


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health_check():
    """Simple endpoint to verify the backend is running."""
    return {"status": "ok"}