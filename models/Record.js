const mongoose = require("mongoose");
const { Schema } = mongoose;

const RecordsSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  meetingName: {
    type: String,
    required: true,
  },
  meetingUrl: {
    type: String,
    required: true,
  },
  botId: {
    type: String,
  },
  bot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "settings",
  },
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "folder",
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

module.exports = mongoose.model("records", RecordsSchema);
