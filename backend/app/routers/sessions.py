from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models import Session as SessionModel, RegionOfInterest

router = APIRouter()


class SessionSummary(BaseModel):
    id: UUID
    status: str
    detection_count: int
    avg_confidence: Optional[float] = None
    min_confidence: Optional[float] = None
    max_confidence: Optional[float] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None

    class Config:
        from_attributes = True


@router.get("/api/sessions", response_model=list[SessionSummary])
async def get_sessions(db: AsyncSession = Depends(get_db)):
    """
    Returns all sessions with aggregated ROI stats per session.
    Uses a LEFT JOIN so sessions with zero detections still appear.
    """
    query = (
        select(
            SessionModel.id,
            SessionModel.status,
            func.count(RegionOfInterest.id).label("detection_count"),
            func.avg(RegionOfInterest.confidence).label("avg_confidence"),
            func.min(RegionOfInterest.confidence).label("min_confidence"),
            func.max(RegionOfInterest.confidence).label("max_confidence"),
            func.min(RegionOfInterest.detection_timestamp).label("started_at"),
            func.max(RegionOfInterest.detection_timestamp).label("ended_at"),
        )
        .outerjoin(RegionOfInterest, RegionOfInterest.session_id == SessionModel.id)
        .group_by(SessionModel.id, SessionModel.status)
        .order_by(func.min(RegionOfInterest.detection_timestamp).desc())
    )

    result = await db.execute(query)
    rows = result.all()

    summaries = []
    for row in rows:
        duration = None
        if row.started_at and row.ended_at and row.started_at != row.ended_at:
            duration = round((row.ended_at - row.started_at).total_seconds(), 1)

        summaries.append(SessionSummary(
            id=row.id,
            status=row.status,
            detection_count=row.detection_count,
            avg_confidence=round(row.avg_confidence, 3) if row.avg_confidence else None,
            min_confidence=round(row.min_confidence, 3) if row.min_confidence else None,
            max_confidence=round(row.max_confidence, 3) if row.max_confidence else None,
            started_at=row.started_at,
            ended_at=row.ended_at,
            duration_seconds=duration,
        ))

    return summaries