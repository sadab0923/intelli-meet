const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    title: { type: String, default: "Untitled meeting" },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    scheduledAt: { type: Date, default: null }, // null = instant meeting
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "ended"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);
