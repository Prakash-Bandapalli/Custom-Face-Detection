from PIL import Image, ImageDraw
from io import BytesIO
import base64
import numpy as np
from app.detection.face_detector import BoundingBox


class ROIDrawer:
    COLOR = (0, 255, 0)       # Green
    LINE_WIDTH = 3

    @classmethod
    def draw(cls, image: Image.Image, bbox: BoundingBox) -> Image.Image:
        """Draw axis-aligned minimal bounding box with Pillow."""
        copy = image.copy()
        draw = ImageDraw.Draw(copy)

        x1, y1 = bbox.x, bbox.y
        x2, y2 = bbox.x + bbox.width, bbox.y + bbox.height

        draw.rectangle([x1, y1, x2, y2],
                       outline=cls.COLOR, width=cls.LINE_WIDTH)
        
        # Draw confidence label slightly above the box
        label = f"Face {bbox.confidence:.0%}"
        draw.text((x1, y1 - 16), label, fill=cls.COLOR)
        
        return copy

    # --- Conversion helpers ---

    @staticmethod
    def b64_to_pil(b64: str) -> Image.Image:
        """Decode base64 JPEG string to Pillow Image."""
        return Image.open(BytesIO(base64.b64decode(b64))).convert("RGB")

    @staticmethod
    def pil_to_b64(img: Image.Image, fmt: str = "JPEG", quality: int = 80) -> str:
        """Encode Pillow Image to base64 JPEG string."""
        buf = BytesIO()
        img.save(buf, format=fmt, quality=quality)
        return base64.b64encode(buf.getvalue()).decode()

    @staticmethod
    def pil_to_np(img: Image.Image) -> np.ndarray:
        """Convert Pillow Image to numpy array (for MediaPipe)."""
        return np.array(img)

    @staticmethod
    def np_to_pil(arr: np.ndarray) -> Image.Image:
        """Convert numpy array back to Pillow Image (for drawing)."""
        return Image.fromarray(arr)