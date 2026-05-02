import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.detection.roi_drawer import ROIDrawer

router = APIRouter()


@router.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    
    # Access the singletons we will create in main.py
    detector = websocket.app.state.face_detector
    stream_mgr = websocket.app.state.stream_manager
    
    frame_count = 0

    try:
        while True:
            # 1. Receive frame from browser
            data = await websocket.receive_text()
            msg = json.loads(data)
            frame_b64 = msg.get("frame")
            
            if not frame_b64:
                continue

            # 2. Decode base64 -> Pillow -> numpy
            pil_img = ROIDrawer.b64_to_pil(frame_b64)
            np_img = ROIDrawer.pil_to_np(pil_img)

            # 3. Detect face
            bbox = detector.detect(np_img)

            roi_data = None

            # 4. Draw ROI if face found
            if bbox:
                # Convert back to PIL to draw
                pil_img = ROIDrawer.np_to_pil(np_img)
                annotated_img = ROIDrawer.draw(pil_img, bbox)
                
                roi_data = {
                    "x": bbox.x,
                    "y": bbox.y,
                    "width": bbox.width,
                    "height": bbox.height,
                    "confidence": round(bbox.confidence, 3)
                }
            else:
                # No face found, send original image back
                annotated_img = pil_img

            # 5. Encode annotated image back to base64
            out_b64 = ROIDrawer.pil_to_b64(annotated_img)

            frame_count += 1

            # 6. Update StreamManager for the MJPEG feed
            stream_mgr.update(out_b64, roi_data, frame_count)

            # 7. Send annotated frame and ROI data back to browser
            await websocket.send_json({
                "frame": out_b64,
                "roi": roi_data,
                "frame_number": frame_count
            })

    except WebSocketDisconnect:
        print("Client disconnected from WebSocket")
    except Exception as e:
        print(f"WebSocket error: {e}")