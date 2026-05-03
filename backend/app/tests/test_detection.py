from PIL import Image
from app.detection.roi_drawer import ROIDrawer
from app.detection.face_detector import BoundingBox

def test_roi_drawer_outputs_valid_image():
    """Test that the Pillow drawing logic works without mutating the original image."""
    # 1. Arrange: Create a blank 100x100 image and a dummy bounding box
    base_img = Image.new("RGB", (100, 100), color="black")
    bbox = BoundingBox(x=10, y=10, width=50, height=50, confidence=0.95)

    # 2. Act: Draw the ROI
    result_img = ROIDrawer.draw(base_img, bbox)

    # 3. Assert: Check it didn't crash and returned a valid Image object
    assert result_img is not None
    assert result_img.size == (100, 100)
    assert result_img is not base_img  # Ensures we made a copy and didn't mutate the original