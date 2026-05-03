import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.detection.roi_drawer import ROIDrawer
from app.database import AsyncSessionLocal
from app.models import Session as SessionModel
from app.services.roi_repository import ROIRepository

router = APIRouter()


async def _save_roi_bg(session_id, frame_number, bbox):
    """
    Fire-and-forget DB write.
    Runs as a background task — never blocks the frame processing loop.
    """
    try:
        async with AsyncSessionLocal() as db:
            repo = ROIRepository(db)
            await repo.save_roi(
                session_id=session_id,
                frame_number=frame_number,
                x=bbox.x,
                y=bbox.y,
                width=bbox.width,
                height=bbox.height,
                confidence=bbox.confidence,
            )
    except Exception as e:
        # Log but never crash the stream over a DB write failure
        print(f"[DB] Background ROI save failed on frame {frame_number}: {e}")


@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()

    detector = websocket.app.state.face_detector
    stream_mgr = websocket.app.state.stream_manager

    frame_count = 0
    db_session_id = None

    # Create a DB session record for this stream connection
    async with AsyncSessionLocal() as db:
        new_session = SessionModel(status="active")
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        db_session_id = new_session.id

    try:
        while True:
            # 1. Receive frame from browser
            data = await websocket.receive_text()
            msg = json.loads(data)
            frame_b64 = msg.get("frame")

            if not frame_b64:
                # Malformed message — ACK anyway so the frontend doesn't stall
                await websocket.send_json({"ack": True, "roi": None})
                continue

            # 2. Decode base64 → PIL → numpy
            pil_img = ROIDrawer.b64_to_pil(frame_b64)
            np_img = ROIDrawer.pil_to_np(pil_img)

            # 3. Detect face
            bbox = detector.detect(np_img)
            roi_data = None

            # 4. Draw ROI if face found
            if bbox:
                annotated = ROIDrawer.draw(pil_img, bbox)
                roi_data = {
                    "x": bbox.x,
                    "y": bbox.y,
                    "width": bbox.width,
                    "height": bbox.height,
                    "confidence": round(bbox.confidence, 3),
                }
                # Kick off DB write as a background task — zero blocking here
                asyncio.create_task(
                    _save_roi_bg(db_session_id, frame_count, bbox)
                )
            else:
                annotated = pil_img

            # 5. Encode annotated frame and push to the MJPEG feed endpoint
            out_b64 = ROIDrawer.pil_to_b64(annotated)
            frame_count += 1
            stream_mgr.update(out_b64, roi_data, frame_count)

            # 6. Send a lightweight ACK back to the browser (no frame bytes!)
            #    The browser uses this ACK as the signal to send its next frame.
            #    This creates natural backpressure: the frontend only ever has
            #    one frame in-flight at a time.
            await websocket.send_json({"ack": True, "roi": roi_data})

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected after {frame_count} frames")
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
    finally:
        if db_session_id:
            try:
                async with AsyncSessionLocal() as db:
                    session_obj = await db.get(SessionModel, db_session_id)
                    if session_obj:
                        session_obj.status = "ended"
                        await db.commit()
            except Exception as e:
                print(f"[DB] Failed to close session: {e}")