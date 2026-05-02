from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.models import RegionOfInterest


class ROIRepository:
    """Pure database operations for ROIs."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_roi(self, session_id: UUID, frame_number: int, 
                       x: int, y: int, width: int, height: int, confidence: float):
        roi = RegionOfInterest(
            session_id=session_id,
            frame_number=frame_number,
            x=x, y=y, width=width, height=height,
            confidence=confidence
        )
        self.db.add(roi)
        await self.db.commit()
        await self.db.refresh(roi)
        return roi

    async def get_rois(self, session_id: UUID | None, min_confidence: float | None, 
                       limit: int, offset: int):
        # Base query
        query = select(RegionOfInterest)
        count_query = select(func.count()).select_from(RegionOfInterest)

        # Apply filters
        if session_id:
            query = query.where(RegionOfInterest.session_id == session_id)
            count_query = count_query.where(RegionOfInterest.session_id == session_id)
        if min_confidence is not None:
            query = query.where(RegionOfInterest.confidence >= min_confidence)
            count_query = count_query.where(RegionOfInterest.confidence >= min_confidence)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(RegionOfInterest.id.desc()).limit(limit).offset(offset)
        result = await self.db.execute(query)
        rois = result.scalars().all()

        return total, rois