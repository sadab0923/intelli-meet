import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useWebRTC from "../hooks/useWebRTC";
import RemoteVideoTile from "../components/RemoteVideoTile";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

export default function Meeting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    localVideoRef,
    remoteStreams, // [{ socketId, userName, stream }]
    micOn,
    camOn,
    isScreenSharing,
    connectionStatus,
    messages,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    sendMessage,
    leaveCall,
  } = useWebRTC(roomId, user?.name);

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput("");
  };

  const handleLeave = async () => {
    leaveCall();
    try {
      await api.post(`/meetings/end/${roomId}`);
    } catch (err) {
      // Non-fatal — meeting may have already ended or user wasn't the host
    }
    navigate("/dashboard");
  };

  const statusLabel = {
    connecting: "Connecting…",
    waiting: "Waiting for others to join…",
    connected: "Connected",
    disconnected: "Disconnected",
  }[connectionStatus];

  const totalParticipants = remoteStreams.length + 1; // + yourself
  const gridColumns = totalParticipants <= 1 ? 1 : totalParticipants <= 4 ? 2 : 3;

  return (
    <div style={styles.container}>
      <div style={styles.main}>
        <div style={styles.topBar}>
          <span style={styles.roomLabel}>Room: {roomId}</span>
          <span style={styles.statusLabel}>
            {statusLabel} · {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
          </span>
        </div>

        <div style={{ ...styles.videoGrid, gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
          <div style={styles.videoBox}>
            <video ref={localVideoRef} autoPlay playsInline muted style={styles.video} />
            <span style={styles.videoTag}>You {!camOn && "(camera off)"}</span>
          </div>

          {remoteStreams.map((p) => (
            <RemoteVideoTile key={p.socketId} userName={p.userName} stream={p.stream} />
          ))}
        </div>

        <div style={styles.controls}>
          <button
            onClick={toggleMic}
            style={{ ...styles.controlBtn, ...(micOn ? {} : styles.btnOff) }}
          >
            {micOn ? "🎤 Mic On" : "🔇 Mic Off"}
          </button>

          <button
            onClick={toggleCam}
            style={{ ...styles.controlBtn, ...(camOn ? {} : styles.btnOff) }}
          >
            {camOn ? "📷 Camera On" : "🚫 Camera Off"}
          </button>

          <button
            onClick={toggleScreenShare}
            style={{ ...styles.controlBtn, ...(isScreenSharing ? styles.btnActive : {}) }}
          >
            {isScreenSharing ? "🟢 Sharing Screen" : "🖥️ Share Screen"}
          </button>

          <button onClick={() => setIsChatOpen((v) => !v)} style={styles.controlBtn}>
            💬 Chat
          </button>

          <button onClick={handleLeave} style={{ ...styles.controlBtn, ...styles.leaveBtn }}>
            📞 Leave
          </button>
        </div>
      </div>

      {isChatOpen && (
        <div style={styles.chatPanel}>
          <div style={styles.chatHeader}>Live Chat</div>
          <div style={styles.chatMessages}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{ ...styles.chatBubble, ...(m.self ? styles.chatBubbleSelf : styles.chatBubbleOther) }}
              >
                <strong>{m.sender}: </strong>
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSend} style={styles.chatForm}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message…"
              style={styles.chatInput}
            />
            <button type="submit" style={styles.chatSendBtn}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100vh", background: "#111", color: "#fff", fontFamily: "sans-serif" },
  main: { flex: 1, display: "flex", flexDirection: "column", padding: "16px" },
  topBar: { display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px", color: "#ccc" },
  roomLabel: { fontWeight: "bold" },
  statusLabel: { fontStyle: "italic" },
  videoGrid: { flex: 1, display: "grid", gap: "12px", alignContent: "start" },
  videoBox: {
    position: "relative", background: "#222", borderRadius: "12px", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center", minHeight: "180px",
  },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  videoTag: {
    position: "absolute", bottom: "8px", left: "8px", background: "rgba(0,0,0,0.6)",
    padding: "2px 8px", borderRadius: "6px", fontSize: "12px",
  },
  controls: { display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px", flexWrap: "wrap" },
  controlBtn: {
    padding: "10px 16px", borderRadius: "8px", border: "none", background: "#2a2a2a",
    color: "#fff", cursor: "pointer", fontSize: "14px",
  },
  btnOff: { background: "#7a1f1f" },
  btnActive: { background: "#1f6f3f" },
  leaveBtn: { background: "#c0392b" },
  chatPanel: { width: "300px", background: "#1a1a1a", display: "flex", flexDirection: "column", borderLeft: "1px solid #333" },
  chatHeader: { padding: "12px", fontWeight: "bold", borderBottom: "1px solid #333" },
  chatMessages: { flex: 1, padding: "12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" },
  chatBubble: { padding: "8px 10px", borderRadius: "8px", fontSize: "13px", maxWidth: "85%" },
  chatBubbleSelf: { background: "#2d5b8a", alignSelf: "flex-end" },
  chatBubbleOther: { background: "#333", alignSelf: "flex-start" },
  chatForm: { display: "flex", padding: "10px", borderTop: "1px solid #333", gap: "8px" },
  chatInput: { flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #444", background: "#111", color: "#fff" },
  chatSendBtn: { padding: "8px 14px", borderRadius: "6px", border: "none", background: "#2d5b8a", color: "#fff", cursor: "pointer" },
};
