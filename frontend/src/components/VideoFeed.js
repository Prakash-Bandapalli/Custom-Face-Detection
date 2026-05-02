import React, { useRef, useEffect, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

function VideoFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { annotatedFrame, roiData, sendFrame } = useWebSocket();
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    let interval;
    const video = videoRef.current;

    const startCapture = () => {
      interval = setInterval(() => {
        if (video && canvasRef.current && video.readyState >= 2) {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
          sendFrame(base64);
        }
      }, 66); // ~15 FPS
    };

    if (isStreaming) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          streamRef.current = stream;
          video.srcObject = stream;

          // WAIT for the video to be ready before capturing!
          video.onloadedmetadata = () => {
            video.play();
            startCapture();
          };
        })
        .catch((err) => console.error("Webcam error:", err));
    } else {
      clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (video) video.srcObject = null;
    }

    return () => {
      clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isStreaming, sendFrame]);

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button
          onClick={() => setIsStreaming(!isStreaming)}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: isStreaming ? "#ff4d4f" : "#52c41a",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          {isStreaming ? "Stop Stream" : "Start Stream"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Live Webcam (Hidden when streaming to save space, but needed for capture) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            display: isStreaming ? "none" : "block",
            width: "100%",
            maxWidth: "400px",
          }}
        />

        {/* Annotated Feed from Backend */}
        {annotatedFrame && isStreaming ? (
          <div>
            <img
              src={annotatedFrame}
              alt="Annotated Feed"
              style={{
                width: "100%",
                maxWidth: "400px",
                border: "2px solid #1890ff",
              }}
            />
            {roiData && (
              <p style={{ fontSize: "14px", color: "#555" }}>
                Confidence: {(roiData.confidence * 100).toFixed(1)}% | Box: [
                {roiData.x}, {roiData.y}, {roiData.width}, {roiData.height}]
              </p>
            )}
          </div>
        ) : (
          <div
            style={{
              width: "400px",
              height: "300px",
              backgroundColor: "#f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p>No stream active</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoFeed;
