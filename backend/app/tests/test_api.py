from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Test that the API starts up and the health endpoint is alive."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_roi_endpoint_validation():
    """Test that the ROI endpoint rejects invalid confidence parameters."""
    # Confidence must be between 0.0 and 1.0. Sending 1.5 should fail.
    response = client.get("/api/roi?min_confidence=1.5")
    assert response.status_code == 422  # 422 Unprocessable Entity (FastAPI validation error)