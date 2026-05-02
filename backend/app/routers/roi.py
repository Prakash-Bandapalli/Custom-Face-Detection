from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.database import get_db
from app.services.roi_repository import ROIRepository
from app.schemas import ROIResponse

router = APIRouter()


@router.get("/api/roi", response_model=ROIResponse)
async def get_roi_data(
    session_id: UUID | None = Query(None, description="Filter by session ID"),
    min_confidence: float | None = Query(None, ge=0.0, le=1.0, description="Minimum confidence threshold"),
    limit: int = Query(50, ge=1, le=500, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Records to skip for pagination"),
    db: AsyncSession = Depends(get_db)
):
    repo = ROIRepository(db)
    total, rois = await repo.get_rois(session_id, min_confidence, limit, offset)
    
    return ROIResponse(
        total=total,
        limit=limit,
        offset=offset,
        data=rois
    )