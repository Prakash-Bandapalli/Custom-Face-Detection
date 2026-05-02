import asyncio
import base64
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter()


async def generate_mjpeg(request: Request):
    """Generator that yields JPEG frames for the MJPEG stream."""
    stream_mgr = request.app.state.stream_manager
    boundary = "frame"
    
    while True:
        # Stop streaming if the client disconnects
        if await request.is_disconnected():
            break
            
        # Wait for a new frame from the StreamManager
        frame_event = await stream_mgr.wait_for_frame(timeout=2.0)
        
        if frame_event and frame_event.frame_b64:
            # Decode base64 back to raw JPEG bytes
            frame_bytes = base64.b64decode(frame_event.frame_b64)
            
            # MJPEG format requires this specific boundary structure
            yield (f"--{boundary}\r\n"
                   f"Content-Type: image/jpeg\r\n\r\n").encode()
            yield frame_bytes
            yield b"\r\n"
        else:
            # If no frame is received (e.g., stream hasn't started yet), wait briefly
            await asyncio.sleep(0.1)


@router.get("/api/feed")
async def mjpeg_feed(request: Request):
    """Serves the annotated video feed as an MJPEG stream."""
    return StreamingResponse(
        generate_mjpeg(request),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )