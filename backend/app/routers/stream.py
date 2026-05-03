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
        print(f"[DB] Background ROI save failed on frame {frame_number}: {e}")


@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()

    detector = websocket.app.state.face_detector
    stream_mgr = websocket.app.state.stream_manager

    frame_count = 0
    db_session_id = None

    try:
        while True:
            # 1. Receive frame from browser
            data = await websocket.receive_text()
            msg = json.loads(data)
            frame_b64 = msg.get("frame")

            if not frame_b64:
                await websocket.send_json({"ack": True, "roi": None})
                continue

            # 2. Create session record on the very first frame only.
            #    This ensures no empty session records are created when
            #    the WebSocket connects but no frames are sent.
            if frame_count == 0 and db_session_id is None:
                async with AsyncSessionLocal() as db:
                    new_session = SessionModel(status="active")
                    db.add(new_session)
                    await db.commit()
                    await db.refresh(new_session)
                    db_session_id = new_session.id

            # 3. Decode base64 → PIL → numpy
            pil_img = ROIDrawer.b64_to_pil(frame_b64)
            np_img = ROIDrawer.pil_to_np(pil_img)

            # 4. Detect face
            bbox = detector.detect(np_img)
            roi_data = None

            # 5. Draw ROI if face found
            if bbox:
                annotated = ROIDrawer.draw(pil_img, bbox)
                roi_data = {
                    "x": bbox.x,
                    "y": bbox.y,
                    "width": bbox.width,
                    "height": bbox.height,
                    "confidence": round(bbox.confidence, 3),
                }
                # Fire-and-forget — never blocks the frame loop
                asyncio.create_task(
                    _save_roi_bg(db_session_id, frame_count, bbox)
                )
            else:
                annotated = pil_img

            # 6. Encode and push to MJPEG feed
            out_b64 = ROIDrawer.pil_to_b64(annotated)
            frame_count += 1
            stream_mgr.update(out_b64, roi_data, frame_count)

            # 7. ACK — signals frontend to send next frame (natural backpressure)
            await websocket.send_json({"ack": True, "roi": roi_data})

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected after {frame_count} frames")
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
    finally:
        # Guard: only runs if a session was actually created
        if db_session_id:
            try:
                async with AsyncSessionLocal() as db:
                    session_obj = await db.get(SessionModel, db_session_id)
                    if session_obj:
                        session_obj.status = "ended"
                        await db.commit()
            except Exception as e:
                print(f"[DB] Failed to close session: {e}")