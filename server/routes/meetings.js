const express = require("express");
const { nanoid } = require("nanoid");
const Meeting = require("../models/Meeting");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// ---------- Create an instant meeting (start now) ----------
router.post("/instant", requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    const roomId = nanoid(10);

    const meeting = await Meeting.create({
      roomId,
      title: title || "Instant meeting",
      host: req.user.id,
      participants: [req.user.id],
      status: "ongoing",
      startedAt: new Date(),
    });

    res.status(201).json({ meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not create meeting" });
  }
});

// ---------- Schedule a future meeting ----------
router.post("/schedule", requireAuth, async (req, res) => {
  try {
    const { title, scheduledAt } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt is required" });
    }

    const roomId = nanoid(10);
    const meeting = await Meeting.create({
      roomId,
      title: title || "Scheduled meeting",
      host: req.user.id,
      participants: [req.user.id],
      status: "scheduled",
      scheduledAt: new Date(scheduledAt),
    });

    res.status(201).json({ meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not schedule meeting" });
  }
});

// ---------- Join an existing room by roomId ----------
router.post("/join/:roomId", requireAuth, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (!meeting.participants.includes(req.user.id)) {
      meeting.participants.push(req.user.id);
    }
    if (meeting.status === "scheduled") {
      meeting.status = "ongoing";
      meeting.startedAt = new Date();
    }
    await meeting.save();

    res.json({ meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not join meeting" });
  }
});

// ---------- Mark a meeting as ended ----------
router.post("/end/:roomId", requireAuth, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndUpdate(
      { roomId: req.params.roomId },
      { status: "ended", endedAt: new Date() },
      { new: true }
    );
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ meeting });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not end meeting" });
  }
});

// ---------- Upcoming (scheduled) meetings for the logged-in user ----------
router.get("/upcoming", requireAuth, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      host: req.user.id,
      status: "scheduled",
    }).sort({ scheduledAt: 1 });

    res.json({ meetings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch upcoming meetings" });
  }
});

// ---------- Meeting history for the logged-in user ----------
router.get("/history", requireAuth, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      participants: req.user.id,
      status: "ended",
    })
      .sort({ endedAt: -1 })
      .limit(50);

    res.json({ meetings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch meeting history" });
  }
});

module.exports = router;
