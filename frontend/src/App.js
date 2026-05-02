import React from "react";
import VideoFeed from "./components/VideoFeed";
import ROITable from "./components/ROITable";

function App() {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1>Real-Time Face Detection</h1>
      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 2 }}>
          <VideoFeed />
        </div>
        <div style={{ flex: 1 }}>
          {/* Pass a prop telling the table to use the REST endpoint 
              just once when the user wants to see history */}
          <ROITable />
        </div>
      </div>
    </div>
  );
}

export default App;
