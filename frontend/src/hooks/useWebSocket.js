import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = "ws://127.0.0.1:8000/ws/stream";

export const useWebSocket = (captureCallbackRef) => {
  const [roiData, setRoiData] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  const sendFrame = useCallback((base64Data) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ frame: base64Data }));
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update ROI display data (null means no face in this frame)
        setRoiData(data.roi ?? null);

        if (data.ack && captureCallbackRef.current) {
          captureCallbackRef.current();
        }
      } catch (e) {
        console.error("[WS] Failed to parse message:", e);
      }
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      setConnected(false);
    };

    ws.onerror = (err) => {
      console.error("[WS] Error:", err);
      ws.close();
    };

    return () => {
      ws.close();
    };
  }, []); // Intentionally empty — WS connects once on mount

  return { roiData, connected, sendFrame };
};
