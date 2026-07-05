import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * useWebRTC — MESH group call (N participants).
 * Every participant opens a direct RTCPeerConnection to every other participant.
 * Good for small groups (~3-6 people). For larger scale, swap for an SFU.
 *
 * Usage:
 *   const {
 *     localVideoRef, remoteStreams, // [{ socketId, userName, stream }]
 *     micOn, camOn, isScreenSharing, connectionStatus,
 *     messages, sendMessage,
 *     toggleMic, toggleCam, toggleScreenShare, leaveCall,
 *   } = useWebRTC(roomId, userName);
 */
export default function useWebRTC(roomId, userName) {
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const localVideoRef = useRef(null);

  // socketId -> { pc, userName }
  const peersRef = useRef(new Map());

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // connecting | waiting | connected | disconnected
  const [messages, setMessages] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState([]); // [{ socketId, userName, stream }]

  const upsertRemoteStream = useCallback((socketId, userNameForPeer, stream) => {
    setRemoteStreams((prev) => {
      const idx = prev.findIndex((p) => p.socketId === socketId);
      const entry = { socketId, userName: userNameForPeer, stream };
      if (idx === -1) return [...prev, entry];
      const copy = [...prev];
      copy[idx] = entry;
      return copy;
    });
  }, []);

  const removeRemoteStream = useCallback((socketId) => {
    setRemoteStreams((prev) => prev.filter((p) => p.socketId !== socketId));
  }, []);

  const createPeerConnection = useCallback(
    (targetSocketId, remoteUserName) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("ice-candidate", {
            target: targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        upsertRemoteStream(targetSocketId, remoteUserName, event.streams[0]);
        setConnectionStatus("connected");
      };

      pc.onconnectionstatechange = () => {
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          removeRemoteStream(targetSocketId);
          peersRef.current.delete(targetSocketId);
        }
      };

      peersRef.current.set(targetSocketId, { pc, userName: remoteUserName });
      return pc;
    },
    [upsertRemoteStream, removeRemoteStream]
  );

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0];
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Could not access camera/mic:", err);
        setConnectionStatus("disconnected");
        return;
      }

      const socket = io(SERVER_URL);
      socketRef.current = socket;

      socket.emit("join-room", { roomId, userName });
      setConnectionStatus("waiting");

      socket.on("existing-users", async ({ users }) => {
        if (users.length > 0) setConnectionStatus("connecting");
        for (const { socketId, userName: remoteName } of users) {
          const pc = createPeerConnection(socketId, remoteName);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { target: socketId, sdp: offer });
        }
      });

      socket.on("user-joined", () => {
        setConnectionStatus("connecting");
      });

      socket.on("offer", async ({ sdp, sender }) => {
        const pc = createPeerConnection(sender, peersRef.current.get(sender)?.userName || "Guest");
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { target: sender, sdp: answer });
      });

      socket.on("answer", async ({ sdp, sender }) => {
        const peer = peersRef.current.get(sender);
        if (peer) {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      });

      socket.on("ice-candidate", async ({ candidate, sender }) => {
        try {
          const peer = peersRef.current.get(sender);
          if (peer && candidate) {
            await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error("Error adding received ICE candidate", err);
        }
      });

      socket.on("user-left", ({ socketId }) => {
        const peer = peersRef.current.get(socketId);
        peer?.pc.close();
        peersRef.current.delete(socketId);
        removeRemoteStream(socketId);
      });

      socket.on("chat-message", ({ text, sender, senderId }) => {
        setMessages((prev) => [
          ...prev,
          { text, sender, self: senderId === socket.id },
        ]);
      });
    }

    init();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((peer) => peer.pc.close());
      peersRef.current.clear();
      socketRef.current?.emit("leave-room", { roomId });
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userName, createPeerConnection, removeRemoteStream]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }, []);

  const replaceOutgoingVideoTrackEverywhere = useCallback((newTrack) => {
    peersRef.current.forEach((peer) => {
      const sender = peer.pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender) sender.replaceTrack(newTrack);
    });
  }, []);

  const stopScreenShare = useCallback(() => {
    if (cameraTrackRef.current) {
      replaceOutgoingVideoTrackEverywhere(cameraTrackRef.current);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    setIsScreenSharing(false);
  }, [replaceOutgoingVideoTrackEverywhere]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      replaceOutgoingVideoTrackEverywhere(screenTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setIsScreenSharing(true);

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Screen share failed or was cancelled:", err);
    }
  }, [replaceOutgoingVideoTrackEverywhere, stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const sendMessage = useCallback(
    (text) => {
      const trimmed = text.trim();
      if (!trimmed || !socketRef.current) return;

      socketRef.current.emit("chat-message", {
        roomId,
        text: trimmed,
        sender: userName || "You",
        senderId: socketRef.current.id,
      });

      setMessages((prev) => [...prev, { text: trimmed, sender: "You", self: true }]);
    },
    [roomId, userName]
  );

  const leaveCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach((peer) => peer.pc.close());
    peersRef.current.clear();
    socketRef.current?.emit("leave-room", { roomId });
    socketRef.current?.disconnect();
  }, [roomId]);

  return {
    localVideoRef,
    remoteStreams,
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
  };
}
