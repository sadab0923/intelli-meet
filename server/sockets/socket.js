/**
 * Socket.IO signaling server for MULTI-USER (mesh) WebRTC group calls.
 *
 * Mesh topology: every participant opens a direct RTCPeerConnection to
 * every other participant. Works well for small groups (~3-6 people).
 * For larger scale, this event contract would need to be swapped out
 * for an SFU (e.g. mediasoup) — the client-facing events could stay similar
 * but media routing would move server-side.
 *
 * Event contract (must match client/src/hooks/useWebRTC.js):
 *
 *   Client -> Server:
 *     join-room     { roomId, userName }
 *     offer         { target, sdp }
 *     answer        { target, sdp }
 *     ice-candidate { target, candidate }
 *     chat-message  { roomId, text, sender, senderId }
 *     leave-room    { roomId }
 *
 *   Server -> Client:
 *     existing-users { users: [{ socketId, userName }] }  // sent to the new joiner
 *     user-joined     { socketId, userName }              // sent to everyone already in the room
 *     offer           { sdp, sender }
 *     answer          { sdp, sender }
 *     ice-candidate   { candidate, sender }
 *     user-left       { socketId }
 *     chat-message    { text, sender, senderId }
 */

// roomId -> Map<socketId, { userName }>
const rooms = new Map();

// socketId -> roomId (for cleanup on disconnect)
const socketRoomMap = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  return rooms.get(roomId);
}

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // ---------- Join room ----------
    socket.on("join-room", ({ roomId, userName }) => {
      if (!roomId) return;

      const room = getRoom(roomId);

      // Tell the new joiner about everyone already in the room
      const existingUsers = Array.from(room.entries()).map(([socketId, info]) => ({
        socketId,
        userName: info.userName,
      }));
      socket.emit("existing-users", { users: existingUsers });

      // Register the new joiner
      room.set(socket.id, { userName: userName || "Guest" });
      socketRoomMap.set(socket.id, roomId);
      socket.join(roomId);

      // Tell everyone else in the room about the new joiner
      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        userName: userName || "Guest",
      });

      console.log(`[socket] ${socket.id} (${userName}) joined room ${roomId}`);
    });

    // ---------- WebRTC signaling relay (targeted, one-to-one) ----------
    socket.on("offer", ({ target, sdp }) => {
      if (!target) return;
      io.to(target).emit("offer", { sdp, sender: socket.id });
    });

    socket.on("answer", ({ target, sdp }) => {
      if (!target) return;
      io.to(target).emit("answer", { sdp, sender: socket.id });
    });

    socket.on("ice-candidate", ({ target, candidate }) => {
      if (!target) return;
      io.to(target).emit("ice-candidate", { candidate, sender: socket.id });
    });

    // ---------- Chat (broadcast to whole room) ----------
    socket.on("chat-message", ({ roomId, text, sender, senderId }) => {
      if (!roomId || !text) return;
      socket.to(roomId).emit("chat-message", {
        text,
        sender: sender || "Participant",
        senderId: senderId || socket.id,
      });
    });

    // ---------- Leave room (explicit) ----------
    socket.on("leave-room", ({ roomId }) => {
      handleLeave(socket, roomId);
    });

    // ---------- Disconnect ----------
    socket.on("disconnect", () => {
      const roomId = socketRoomMap.get(socket.id);
      if (roomId) handleLeave(socket, roomId);
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });

  function handleLeave(socket, roomId) {
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) rooms.delete(roomId);
    }
    socketRoomMap.delete(socket.id);
    socket.to(roomId).emit("user-left", { socketId: socket.id });
    socket.leave(roomId);
    console.log(`[socket] ${socket.id} left room ${roomId}`);
  }
}

module.exports = registerSocketHandlers;
