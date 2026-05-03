import React, { useState } from "react";
import VideoFeed from "./components/VideoFeed";
import ROITable from "./components/ROITable";

function App() {
  const [tab, setTab] = useState("feed");

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Face Detection System</h1>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        <button
          onClick={() => setTab("feed")}
          style={{ ...s.tab, ...(tab === "feed" ? s.tabActive : {}) }}
        >
          Live Feed
        </button>
        <button
          onClick={() => setTab("history")}
          style={{ ...s.tab, ...(tab === "history" ? s.tabActive : {}) }}
        >
          Detection History
        </button>
      </div>

      {/* Content */}
      <div style={s.content}>
        {tab === "feed" ? <VideoFeed /> : <ROITable />}
      </div>
    </div>
  );
}

const s = {
  root: {
    fontFamily: "Arial, sans-serif",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    borderBottom: "1px solid #e0e0e0",
    padding: "0 32px",
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: "#1a1a1a",
    margin: 0,
    padding: "16px 0",
  },
  tabBar: {
    display: "flex",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e0e0e0",
    padding: "0 32px",
    gap: 0,
  },
  tab: {
    padding: "12px 24px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    background: "none",
    color: "#666",
    borderBottom: "2px solid transparent",
    marginBottom: -1,
    transition: "all 0.15s",
  },
  tabActive: {
    color: "#1890ff",
    borderBottom: "2px solid #1890ff",
  },
  content: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "28px 32px",
  },
};

// Reset body margin
document.body.style.margin = "0";

export default App;
