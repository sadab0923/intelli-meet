import React, { useEffect, useRef } from "react";

export default function RemoteVideoTile({ userName, stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={styles.box}>
      <video ref={videoRef} autoPlay playsInline style={styles.video} />
      <span style={styles.tag}>{userName || "Participant"}</span>
    </div>
  );
}

const styles = {
  box: {
    position: "relative",
    background: "#222",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "180px",
  },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  tag: {
    position: "absolute",
    bottom: "8px",
    left: "8px",
    background: "rgba(0,0,0,0.6)",
    padding: "2px 8px",
    borderRadius: "6px",
    fontSize: "12px",
  },
};
