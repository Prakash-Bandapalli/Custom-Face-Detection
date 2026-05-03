from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional


class ROIData(BaseModel):
    id: int
    session_id: UUID
    frame_number: int
    x: int
    y: int
    width: int
    height: int
    confidence: Optional[float] = None
    detection_timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class ROIResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: list[ROIData]