import React, { useRef, useEffect, useState, useCallback } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

// The MJPEG feed endpoint — browser handles this natively as a continuous stream
const FEED_URL = "http://127.0.0.1:8000/api/feed";

function VideoFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef(false); // Ref mirror so callbacks always see current value

  // This ref holds the capture function. We pass it to useWebSocket so the
  // hook can call it on each ACK without any stale closure issues.
  const captureCallbackRef = useRef(null);

  const { roiData, connected, sendFrame } = useWebSocket(captureCallbackRef);

  // Keep the isStreaming ref in sync with state
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const captureAndSend = useCallback(() => {
    // Stop immediately if the user clicked "Stop"
    if (!isStreamingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      // Video not ready yet — retry shortly
      setTimeout(() => captureCallbackRef.current?.(), 50);
      return;
    }

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
    sendFrame(base64);
  }, [sendFrame]);

  // Keep the ref in sync with the latest captureAndSend function
  useEffect(() => {
    captureCallbackRef.current = captureAndSend;
  }, [captureAndSend]);

  // Manage webcam stream lifecycle
  useEffect(() => {
    const video = videoRef.current;

    if (isStreaming) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          streamRef.current = stream;
          video.srcObject = stream;

          video.onloadedmetadata = () => {
            video.play();

            const canvas = canvasRef.current;
            if (canvas) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }

            // Kick off the first frame to start the ACK loop
            if (connected) {
              captureAndSend();
            }
          };
        })
        .catch((err) => console.error("[Camera] getUserMedia failed:", err));
    } else {
      // Tear down webcam
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (video) video.srcObject = null;
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isStreaming]); // eslint-disable-line

  // If the WebSocket connects AFTER the stream is already running (e.g. reconnect),
  // kick off the capture loop again.
  useEffect(() => {
    if (isStreaming && connected) {
      captureAndSend();
    }
  }, [connected]); // eslint-disable-line

  const handleToggle = () => setIsStreaming((s) => !s);

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <button
          onClick={handleToggle}
          style={{
            padding: "10px 22px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            backgroundColor: isStreaming ? "#ff4d4f" : "#52c41a",
            color: "white",
            border: "none",
            borderRadius: "6px",
            transition: "background-color 0.2s",
          }}
        >
          {isStreaming ? "Stop Stream" : "Start Stream"}
        </button>

        <span
          style={{ fontSize: "13px", color: connected ? "#52c41a" : "#999" }}
        >
          {connected ? "● WebSocket connected" : "○ WebSocket disconnected"}
        </span>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
          }}
        />

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div
          style={{
            width: 640,
            height: 480,
            backgroundColor: "#111",
            borderRadius: "6px",
            overflow: "hidden",
            border: "2px solid #1890ff",
            flexShrink: 0,
          }}
        >
          {isStreaming ? (
            <img
              src={FEED_URL}
              alt="Annotated face detection feed"
              style={{
                width: 640,
                height: 480,
                display: "block",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 640,
                height: 480,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#555",
                fontSize: "15px",
              }}
            >
              No stream active
            </div>
          )}
        </div>

        {/* Live ROI data panel */}
        <div
          style={{
            minWidth: 200,
            padding: "14px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            backgroundColor: "#fafafa",
          }}
        >
          <strong style={{ display: "block", marginBottom: "10px" }}>
            Live ROI
          </strong>
          {isStreaming && roiData ? (
            <>
              <p style={{ margin: "4px 0" }}>
                <b>Confidence:</b> {(roiData.confidence * 100).toFixed(1)}%
              </p>
              <p style={{ margin: "4px 0" }}>
                <b>X:</b> {roiData.x} &nbsp; <b>Y:</b> {roiData.y}
              </p>
              <p style={{ margin: "4px 0" }}>
                <b>W:</b> {roiData.width} &nbsp; <b>H:</b> {roiData.height}
              </p>
            </>
          ) : (
            <p style={{ color: "#aaa", margin: 0 }}>
              {isStreaming ? "No face detected" : "Start stream to see data"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoFeed;
