import React, { useState } from "react";

function ROITable() {
  const [rois, setRois] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/roi?limit=50");
      if (response.ok) {
        const data = await response.json();
        setRois(data.data);
        setTotal(data.total);
      } else {
        setError(`Server returned ${response.status}`);
      }
    } catch (err) {
      setError("Could not reach backend. Is it running?");
      console.error("Failed to fetch ROI data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>ROI Detections ({total} total in DB)</h2>

      <button
        onClick={fetchHistory}
        disabled={loading}
        style={{
          padding: "8px 16px",
          marginBottom: "10px",
          cursor: loading ? "not-allowed" : "pointer",
          backgroundColor: "#1890ff",
          color: "white",
          border: "none",
          borderRadius: "5px",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Loading..." : "Load DB History"}
      </button>

      {error && (
        <p style={{ color: "#ff4d4f", fontSize: "13px", marginBottom: "8px" }}>
          {error}
        </p>
      )}

      <div
        style={{
          maxHeight: "500px",
          overflowY: "auto",
          border: "1px solid #ddd",
          borderRadius: "5px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead
            style={{ backgroundColor: "#f5f5f5", position: "sticky", top: 0 }}
          >
            <tr>
              <th style={thStyle}>Frame</th>
              <th style={thStyle}>X</th>
              <th style={thStyle}>Y</th>
              <th style={thStyle}>W</th>
              <th style={thStyle}>H</th>
              <th style={thStyle}>Conf%</th>
            </tr>
          </thead>
          <tbody>
            {rois.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#aaa",
                  }}
                >
                  {loading ? "Fetching..." : "Click button to load history"}
                </td>
              </tr>
            ) : (
              rois.map((roi) => (
                <tr key={roi.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>{roi.frame_number}</td>
                  <td style={tdStyle}>{roi.x}</td>
                  <td style={tdStyle}>{roi.y}</td>
                  <td style={tdStyle}>{roi.width}</td>
                  <td style={tdStyle}>{roi.height}</td>
                  <td style={tdStyle}>{(roi.confidence * 100).toFixed(1)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "2px solid #ddd",
};
const tdStyle = { padding: "10px", textAlign: "left" };

export default ROITable;
