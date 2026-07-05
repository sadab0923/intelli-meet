# IntelliMeet

A Google Meet-style video conferencing app: multi-user group calls (mesh WebRTC),
login/signup (JWT auth), meeting scheduling, and meeting history.

## Architecture

```
intelli-meet/
├── server/          Express + MongoDB + Socket.IO backend
│   ├── config/db.js
│   ├── models/User.js
│   ├── models/Meeting.js
│   ├── middleware/auth.js
│   ├── routes/auth.js
│   ├── routes/meetings.js
│   ├── sockets/socket.js
│   └── index.js
└── client/          React + Vite frontend
    └── src/
        ├── api/api.js
        ├── context/AuthContext.jsx
        ├── components/ProtectedRoute.jsx
        ├── components/RemoteVideoTile.jsx
        ├── hooks/useWebRTC.js
        ├── pages/Login.jsx
        ├── pages/Signup.jsx
        ├── pages/Dashboard.jsx
        └── pages/Meeting.jsx
```

## Important note on scale

Group calls use a **mesh topology**: every participant connects directly to
every other participant. This works well for roughly **3–6 people** per call.
Beyond that, browsers and upload bandwidth become the bottleneck — real
Google Meet routes everyone's video through a media server (SFU, e.g.
mediasoup or LiveKit) instead. If you outgrow mesh, the socket event names
here (`offer`, `answer`, `ice-candidate`, `join-room`) are a reasonable
starting contract to adapt for an SFU migration, but the peer-connection
logic in `useWebRTC.js` would need to be replaced.

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# edit .env: set MONGO_URI (local Mongo or Atlas) and a real JWT_SECRET
npm run dev
```

Requires a running MongoDB instance (local `mongod`, or a free MongoDB Atlas
cluster — set `MONGO_URI` accordingly).

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env
# edit .env if your backend isn't on localhost:5000
npm run dev
```

Open `http://localhost:5173`.

## Flow

1. Sign up / log in.
2. From the dashboard: start an **instant meeting**, **schedule** one for
   later, or **join** with a meeting code.
3. Inside a meeting: toggle mic/camera, share your screen, chat live, and
   see every other participant in a responsive grid.
4. Leaving a meeting marks it as "ended" and it shows up in **history**.

## Known limitations / next steps

- Mesh call quality degrades past ~6 participants — see note above.
- No recording, breakout rooms, or waiting-room/host-approval yet.
- No email verification or password reset flow.
- CORS is currently locked to a single `CLIENT_URL` — extend if you deploy
  behind multiple domains.
