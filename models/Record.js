const mongoose = require("mongoose");
const { Schema } = mongoose;

const RecordsSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  meetingName: {
    type: String,
    required: true,
  },
  meetingUrl: {
    type: String,
    required: true,
  },
  videoUrl: {
    type: String,
    default: "null",
  },
  botId: {
    type: String,
  },
  bot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Setting",
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
  },
  platform: {
    type: String,
    default: "null",
  },
  transcript: {
    type: String,
    default: "null",
  },
  notes: {
    type: String,
    default: "null",
  },
  summary: {
    type: String,
    default: "null",
  },
  status: {
    type: String,
    default: "pending",
  },
  joinAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Record", RecordsSchema);
