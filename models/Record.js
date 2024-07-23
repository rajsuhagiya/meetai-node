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
  action: {
    type: String,
    required: true,
  },
  bot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Setting",
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
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
