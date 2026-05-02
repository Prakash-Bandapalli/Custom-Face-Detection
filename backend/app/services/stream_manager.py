import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class FrameEvent:
    frame_b64: str
    roi: dict | None
    frame_number: int
    timestamp: datetime


class StreamManager:
    """Singleton that bridges the input WebSocket to the MJPEG feed."""

    def __init__(self):
        self._latest: FrameEvent | None = None
        self._event: asyncio.Event = asyncio.Event()

    def update(self, frame_b64: str, roi: dict | None, frame_number: int):
        self._latest = FrameEvent(frame_b64, roi, frame_number, datetime.now(timezone.utc))
        self._event.set()
        self._event = asyncio.Event()

    async def wait_for_frame(self, timeout: float = 1.0) -> FrameEvent | None:
        try:
            await asyncio.wait_for(self._event.wait(), timeout)
        except asyncio.TimeoutError:
            return None
        return self._latest

    @property
    def latest(self) -> FrameEvent | None:
        return self._latest