import React, { useState } from "react";

function ROITable() {
  const [rois, setRois] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/roi?limit=50");
      if (response.ok) {
        const data = await response.json();
        setRois(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch ROI data:", error);
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
          cursor: "pointer",
          backgroundColor: "#1890ff",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        {loading ? "Loading..." : "Load DB History"}
      </button>

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
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Click button to load history
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
