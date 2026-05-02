import { useState, useEffect, useRef } from "react";

const WS_URL = "ws://localhost:8000/ws/stream";

export const useWebSocket = () => {
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const [roiData, setRoiData] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket Connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.frame) {
          setAnnotatedFrame(`data:image/jpeg;base64,${data.frame}`);
        }
        if (data.roi) {
          setRoiData(data.roi);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket Disconnected. Reconnecting...");
        // Automatically reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendFrame = (base64Data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ frame: base64Data }));
    }
  };

  return { annotatedFrame, roiData, sendFrame };
};
