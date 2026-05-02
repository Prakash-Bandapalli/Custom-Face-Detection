from sqlalchemy import Column, String, Integer, Float, BigInteger, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(20), nullable=False, default="active")

    # Relationship: one session has many ROIs
    rois = relationship("RegionOfInterest", back_populates="session", cascade="all, delete-orphan")


class RegionOfInterest(Base):
    __tablename__ = "regions_of_interest"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=True)

    # Relationship: each ROI belongs to one session
    session = relationship("Session", back_populates="rois")

    # Check constraints to keep our data clean
    __table_args__ = (
        CheckConstraint('x >= 0', name='check_x_non_negative'),
        CheckConstraint('y >= 0', name='check_y_non_negative'),
        CheckConstraint('width > 0', name='check_width_positive'),
        CheckConstraint('height > 0', name='check_height_positive'),
        CheckConstraint('confidence >= 0 AND confidence <= 1', name='check_confidence_range'),
    )