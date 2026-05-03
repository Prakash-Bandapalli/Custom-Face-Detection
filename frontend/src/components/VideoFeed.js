import React, { useRef, useEffect, useState, useCallback } from "react";
import { useWebSocket } from "../hooks/useWebSocket";

const FEED_URL = `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/api/feed`;

function VideoFeed() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const startTimeRef = useRef(null);
  const fpsRef = useRef(0);

  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [totalDetections, setTotalDetections] = useState(0);

  const isStreamingRef = useRef(false);
  const captureCallbackRef = useRef(null);

  const { roiData, connected, sendFrame } = useWebSocket(
    captureCallbackRef,
    isStreaming,
  );

  useEffect(() => {
    if (roiData) setTotalDetections((n) => n + 1);
  }, [roiData]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Timer + FPS
  useEffect(() => {
    if (!isStreaming) return;
    startTimeRef.current = Date.now();
    fpsRef.current = 0;
    setTotalDetections(0);
    setSessionTime(0);
    setFps(0);

    const timer = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    const fpsTimer = setInterval(() => {
      setFps(fpsRef.current);
      fpsRef.current = 0;
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(fpsTimer);
    };
  }, [isStreaming]);

  const captureAndSend = useCallback(() => {
    if (!isStreamingRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
      setTimeout(() => captureCallbackRef.current?.(), 50);
      return;
    }
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
    fpsRef.current += 1;
    sendFrame(base64);
  }, [sendFrame]);

  useEffect(() => {
    captureCallbackRef.current = captureAndSend;
  }, [captureAndSend]);

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
            if (connected) captureAndSend();
          };
        })
        .catch((err) => console.error("[Camera] getUserMedia failed:", err));
    } else {
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

  useEffect(() => {
    if (isStreaming && connected) captureAndSend();
  }, [connected]); // eslint-disable-line

  const fmtTime = (sec) =>
    `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div>
      {/* Controls */}
      <div style={s.controlRow}>
        <button
          onClick={() => setIsStreaming((v) => !v)}
          style={{
            ...s.btn,
            backgroundColor: isStreaming ? "#ff4d4f" : "#52c41a",
          }}
        >
          {isStreaming ? "Stop Stream" : "Start Stream"}
        </button>

        <span style={{ fontSize: 13, color: connected ? "#52c41a" : "#999" }}>
          ● {connected ? "WebSocket connected" : "WebSocket disconnected"}
        </span>
      </div>

      {/* Feed + stats */}
      <div style={s.row}>
        {/* Video */}
        <div style={s.feedBox}>
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
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {isStreaming ? (
            <img src={FEED_URL} alt="Annotated feed" style={s.feedImg} />
          ) : (
            <div style={s.placeholder}>Camera inactive</div>
          )}
        </div>

        {/* Stats + ROI */}
        <div style={s.sidePanel}>
          {/* Stat cards */}
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statLabel}>Session Time</div>
              <div style={s.statVal}>
                {isStreaming ? fmtTime(sessionTime) : "—"}
              </div>
            </div>
            <div style={s.statCard}>
              <div style={s.statLabel}>FPS</div>
              <div style={s.statVal}>{isStreaming ? fps : "—"}</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statLabel}>Detections</div>
              <div style={{ ...s.statVal, color: "#1890ff" }}>
                {isStreaming ? totalDetections : "—"}
              </div>
            </div>
          </div>

          {/* Live ROI */}
          <div style={s.roiCard}>
            <div style={s.roiTitle}>Live Bounding Box</div>
            {isStreaming && roiData ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <tbody>
                  {[
                    ["X", roiData.x],
                    ["Y", roiData.y],
                    ["Width", roiData.width],
                    ["Height", roiData.height],
                    ["Confidence", `${(roiData.confidence * 100).toFixed(1)}%`],
                  ].map(([label, val]) => (
                    <tr
                      key={label}
                      style={{ borderBottom: "1px solid #f0f0f0" }}
                    >
                      <td
                        style={{ padding: "7px 0", color: "#888", width: 90 }}
                      >
                        {label}
                      </td>
                      <td
                        style={{
                          padding: "7px 0",
                          fontWeight: 600,
                          color: "#1a1a1a",
                        }}
                      >
                        {val}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "#bbb", fontSize: 13, margin: 0 }}>
                {isStreaming ? "No face detected" : "Start stream to see data"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  controlRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  btn: {
    padding: "9px 22px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    border: "none",
    borderRadius: 5,
    cursor: "pointer",
  },
  row: { display: "flex", gap: 20, alignItems: "flex-start" },
  feedBox: {
    position: "relative",
    width: 640,
    height: 480,
    flexShrink: 0,
    backgroundColor: "#000",
    borderRadius: 6,
    overflow: "hidden",
    border: "1px solid #e0e0e0",
  },
  feedImg: { width: 640, height: 480, display: "block", objectFit: "cover" },
  placeholder: {
    width: 640,
    height: 480,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#555",
    fontSize: 14,
  },
  sidePanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minWidth: 0,
  },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  statCard: {
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "12px 14px",
  },
  statLabel: { fontSize: 11, color: "#999", marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: 700, color: "#1a1a1a" },
  roiCard: {
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "14px 16px",
    flex: 1,
  },
  roiTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: 12,
  },
};

export default VideoFeed;
