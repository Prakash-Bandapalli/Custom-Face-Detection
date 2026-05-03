import React, { useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const pct = (v) => (v != null ? `${(v * 100).toFixed(1)}%` : "—");
const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
const fmtDur = (s) => {
  if (s == null) return "—";
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};
const confColor = (v) =>
  v == null ? "#999" : v >= 0.8 ? "#52c41a" : v >= 0.6 ? "#faad14" : "#ff4d4f";

function ROIDetail({ sessionId }) {
  const [rois, setRois] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/roi?session_id=${sessionId}&limit=200`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setRois(d.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div style={s.msg}>Loading…</div>;
  if (error) return <div style={{ ...s.msg, color: "#ff4d4f" }}>{error}</div>;
  if (!rois?.length)
    return <div style={s.msg}>No detections in this session.</div>;

  return (
    <div style={s.detailWrap}>
      <table style={s.detailTable}>
        <thead>
          <tr style={{ backgroundColor: "#fafafa" }}>
            {["Frame", "Time", "X", "Y", "W", "H", "Confidence"].map((h) => (
              <th key={h} style={s.dth}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rois.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
              <td style={s.dtd}>{r.frame_number}</td>
              <td style={s.dtd}>{fmtTime(r.detection_timestamp)}</td>
              <td style={s.dtd}>{r.x}</td>
              <td style={s.dtd}>{r.y}</td>
              <td style={s.dtd}>{r.width}</td>
              <td style={s.dtd}>{r.height}</td>
              <td style={s.dtd}>
                <span
                  style={{ color: confColor(r.confidence), fontWeight: 600 }}
                >
                  {pct(r.confidence)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ROITable() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    setExpanded(null);
    try {
      const res = await fetch(`${API}/api/sessions`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setSessions(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setExpanded((p) => (p === id ? null : id));

  return (
    <div>
      <div style={s.topBar}>
        <button
          onClick={fetchSessions}
          disabled={loading}
          style={{
            ...s.btn,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading…" : sessions.length ? "Refresh" : "Load History"}
        </button>
        {sessions.length > 0 && (
          <span style={{ fontSize: 13, color: "#999" }}>
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </span>
        )}
        {error && (
          <span style={{ fontSize: 13, color: "#ff4d4f" }}>{error}</span>
        )}
      </div>

      {!loading && sessions.length === 0 && !error && (
        <div style={s.empty}>
          Click "Load History" to view past detection sessions.
        </div>
      )}

      {sessions.length > 0 && (
        <div style={s.tableWrap}>
          {/* Header */}
          <div style={{ ...s.row, ...s.headerRow }}>
            <div style={{ width: 28 }} />
            <div style={s.hcell}>Status</div>
            <div style={s.hcell}>Started</div>
            <div style={s.hcell}>Duration</div>
            <div style={s.hcell}>Detections</div>
            <div style={s.hcell}>Avg Conf</div>
            <div style={s.hcell}>Min / Max</div>
          </div>

          {/* Session rows */}
          {sessions.map((session, i) => (
            <div key={session.id}>
              <div
                onClick={() => toggle(session.id)}
                style={{
                  ...s.row,
                  ...s.sessionRow,
                  backgroundColor: expanded === session.id ? "#e6f4ff" : "#fff",
                  borderBottom:
                    i < sessions.length - 1 ? "1px solid #f0f0f0" : "none",
                }}
              >
                {/* Chevron */}
                <div
                  style={{
                    width: 28,
                    color: "#1890ff",
                    fontSize: 12,
                    paddingLeft: 4,
                  }}
                >
                  {expanded === session.id ? "▾" : "▸"}
                </div>

                {/* Status */}
                <div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 99,
                      backgroundColor:
                        session.status === "active" ? "#f6ffed" : "#f5f5f5",
                      color: session.status === "active" ? "#52c41a" : "#999",
                      border: `1px solid ${session.status === "active" ? "#b7eb8f" : "#e0e0e0"}`,
                    }}
                  >
                    {session.status}
                  </span>
                </div>

                <div style={s.cell}>{fmtTime(session.started_at)}</div>
                <div style={s.cell}>{fmtDur(session.duration_seconds)}</div>
                <div style={{ ...s.cell, fontWeight: 600, color: "#1890ff" }}>
                  {session.detection_count}
                </div>
                <div
                  style={{
                    ...s.cell,
                    fontWeight: 600,
                    color: confColor(session.avg_confidence),
                  }}
                >
                  {pct(session.avg_confidence)}
                </div>
                <div style={{ ...s.cell, color: "#999" }}>
                  {session.min_confidence != null
                    ? `${pct(session.min_confidence)} / ${pct(session.max_confidence)}`
                    : "—"}
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === session.id && (
                <div
                  style={{
                    borderTop: "1px solid #e0e0e0",
                    borderBottom: "1px solid #e0e0e0",
                  }}
                >
                  <ROIDetail sessionId={session.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COLS = "28px 90px 110px 100px 110px 100px 1fr";

const s = {
  topBar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  btn: {
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: "#1890ff",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    fontFamily: "inherit",
  },
  empty: {
    padding: "48px 0",
    textAlign: "center",
    fontSize: 14,
    color: "#bbb",
  },
  tableWrap: {
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  row: {
    display: "grid",
    gridTemplateColumns: COLS,
    alignItems: "center",
    gap: 0,
    padding: "10px 16px",
  },
  headerRow: {
    backgroundColor: "#fafafa",
    borderBottom: "2px solid #e0e0e0",
  },
  hcell: {
    fontSize: 12,
    fontWeight: 600,
    color: "#555",
  },
  sessionRow: {
    cursor: "pointer",
    transition: "background 0.15s",
  },
  cell: { fontSize: 13, color: "#333" },
  detailWrap: {
    maxHeight: 260,
    overflowY: "auto",
    overflowX: "auto",
    backgroundColor: "#fafafa",
  },
  detailTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    minWidth: 480,
  },
  dth: {
    padding: "8px 14px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: "#888",
    borderBottom: "1px solid #e0e0e0",
    position: "sticky",
    top: 0,
    backgroundColor: "#fafafa",
  },
  dtd: { padding: "7px 14px", color: "#333" },
  msg: { padding: "16px 14px", fontSize: 13, color: "#bbb" },
};

export default ROITable;
