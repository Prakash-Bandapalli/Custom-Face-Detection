import mediapipe as mp
import numpy as np
from dataclasses import dataclass


@dataclass
class BoundingBox:
    x: int
    y: int
    width: int
    height: int
    confidence: float


class FaceDetector:
    """Singleton-style face detector using MediaPipe."""
    
    def __init__(self, min_confidence: float = 0.5, model: int = 0):
        # Load the model ONCE during initialization
        self._detector = mp.solutions.face_detection.FaceDetection(
            model_selection=model,          # 0=short-range, 1=full-range
            min_detection_confidence=min_confidence
        )

    def detect(self, image_rgb: np.ndarray) -> BoundingBox | None:
        """Accepts HxWx3 numpy array (RGB). Returns None if no face."""
        if image_rgb is None or image_rgb.size == 0:
            return None
            
        results = self._detector.process(image_rgb)
        
        if not results.detections:
            return None

        # Assume only one face (as per project requirements)
        det = results.detections[0]
        bb = det.location_data.relative_bounding_box
        h, w = image_rgb.shape[:2]

        # Clamp coordinates to image bounds to prevent Pillow crashing later
        x = max(0, int(bb.xmin * w))
        y = max(0, int(bb.ymin * h))
        
        # Calculate width/height ensuring they don't exceed image bounds
        width = min(w - x, int(bb.width * w))
        height = min(h - y, int(bb.height * h))

        # If width or height is 0 after clamping, face is fully out of frame
        if width <= 0 or height <= 0:
            return None

        return BoundingBox(
            x=x, 
            y=y, 
            width=width, 
            height=height, 
            confidence=det.score[0]
        )

    def close(self):
        self._detector.close()

    # Allows using this class with Python's "with" statement
    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()