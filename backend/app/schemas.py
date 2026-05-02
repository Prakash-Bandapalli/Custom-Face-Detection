from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class ROIData(BaseModel):
    id: int
    session_id: UUID
    frame_number: int
    x: int
    y: int
    width: int
    height: int
    confidence: float | None
    detection_timestamp: datetime

    class Config:
        from_attributes = True  # Allows reading data directly from SQLAlchemy models


class ROIResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: list[ROIData]