const mongoose = require("mongoose");
const { Schema } = mongoose;

const RecordsDetailsSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "record",
  },
  image: {
    type: String,
    default: "null",
  },
  meetingUrl: {
    type: String,
    default: "null",
  },
  videoUrl: {
    type: String,
    default: "null",
  },
  botLeave: {
    type: String,
    default: "null",
  },
  transcribe: {
    type: String,
    default: "null",
  },
  actions: {
    type: String,
    default: "null",
  },
  faqs: {
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
  startTime: {
    type: Date,
    default: "null",
  },
  endTime: {
    type: Date,
    default: "null",
  },
  joinAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("recordsDetails", RecordsDetailsSchema);
