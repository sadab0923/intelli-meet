import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState("");
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [upcomingRes, historyRes] = await Promise.all([
        api.get("/meetings/upcoming"),
        api.get("/meetings/history"),
      ]);
      setUpcoming(upcomingRes.data.meetings);
      setHistory(historyRes.data.meetings);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startInstantMeeting = async () => {
    try {
      const res = await api.post("/meetings/instant", { title: "Instant meeting" });
      navigate(`/meeting/${res.data.meeting.roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start meeting");
    }
  };

  const joinMeeting = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      await api.post(`/meetings/join/${joinCode.trim()}`);
      navigate(`/meeting/${joinCode.trim()}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not join meeting");
    }
  };

  const scheduleMeeting = async (e) => {
    e.preventDefault();
    if (!scheduleAt) return;
    try {
      await api.post("/meetings/schedule", {
        title: scheduleTitle || "Scheduled meeting",
        scheduledAt: scheduleAt,
      });
      setScheduleTitle("");
      setScheduleAt("");
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not schedule meeting");
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>IntelliMeet</h1>
        <div style={styles.userBox}>
          <span>{user?.name}</span>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.grid}>
        {/* Quick actions */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Start or join a meeting</h2>

          <button onClick={startInstantMeeting} style={styles.primaryBtn}>
            ➕ New instant meeting
          </button>

          <form onSubmit={joinMeeting} style={styles.inlineForm}>
            <input
              placeholder="Enter meeting code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.secondaryBtn}>Join</button>
          </form>
        </section>

        {/* Schedule */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Schedule a meeting</h2>
          <form onSubmit={scheduleMeeting} style={styles.scheduleForm}>
            <input
              placeholder="Meeting title"
              value={scheduleTitle}
              onChange={(e) => setScheduleTitle(e.target.value)}
              style={styles.input}
            />
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.secondaryBtn}>Schedule</button>
          </form>
        </section>

        {/* Upcoming */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Upcoming meetings</h2>
          {upcoming.length === 0 && <p style={styles.emptyText}>No upcoming meetings.</p>}
          {upcoming.map((m) => (
            <div key={m._id} style={styles.listItem}>
              <div>
                <strong>{m.title}</strong>
                <div style={styles.subText}>
                  {new Date(m.scheduledAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => navigate(`/meeting/${m.roomId}`)}
                style={styles.smallBtn}
              >
                Start
              </button>
            </div>
          ))}
        </section>

        {/* History */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Meeting history</h2>
          {history.length === 0 && <p style={styles.emptyText}>No past meetings yet.</p>}
          {history.map((m) => (
            <div key={m._id} style={styles.listItem}>
              <div>
                <strong>{m.title}</strong>
                <div style={styles.subText}>
                  {m.endedAt ? new Date(m.endedAt).toLocaleString() : "—"}
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0f0f0f", color: "#fff", fontFamily: "sans-serif" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid #222",
  },
  logo: { fontSize: "20px" },
  userBox: { display: "flex", alignItems: "center", gap: "12px" },
  logoutBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },
  errorBanner: {
    margin: "12px 24px 0",
    background: "#7a1f1f",
    padding: "10px",
    borderRadius: "8px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    padding: "24px",
  },
  card: {
    background: "#1a1a1a",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  cardTitle: { fontSize: "16px", marginBottom: "4px" },
  primaryBtn: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#2d5b8a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  secondaryBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#333",
    color: "#fff",
    cursor: "pointer",
  },
  inlineForm: { display: "flex", gap: "8px" },
  scheduleForm: { display: "flex", flexDirection: "column", gap: "8px" },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#111",
    padding: "10px 12px",
    borderRadius: "8px",
  },
  subText: { fontSize: "12px", color: "#999" },
  smallBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    background: "#2d5b8a",
    color: "#fff",
    cursor: "pointer",
  },
  emptyText: { color: "#777", fontSize: "13px" },
};
