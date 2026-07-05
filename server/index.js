require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const registerSocketHandlers = require("./sockets/socket");
const authRoutes = require("./routes/auth");
const meetingRoutes = require("./routes/meetings");

const app = express();
const server = http.createServer(app);

const rawClientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const CLIENT_URL = rawClientUrl.trim();

// Temporary diagnostic — shows exact character codes to catch hidden newlines/unicode chars
console.log(`[cors] CLIENT_URL raw length: ${rawClientUrl.length}`);
console.log(`[cors] CLIENT_URL trimmed length: ${CLIENT_URL.length}`);
console.log(
  `[cors] CLIENT_URL char codes: ${[...CLIENT_URL].map((c) => c.charCodeAt(0)).join(",")}`
);
console.log(`[cors] CLIENT_URL value: ${JSON.stringify(CLIENT_URL)}`);

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/", (req, res) => {
  res.json({
    message: "IntelliMeet API is running",
    health: "/api/health",
  });
});

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[server] IntelliMeet backend running on port ${PORT}`);
  });
});
