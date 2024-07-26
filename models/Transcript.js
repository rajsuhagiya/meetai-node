const mongoose = require("mongoose");
const { Schema } = mongoose;

const TranscriptSchema = new Schema({
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Record",
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Transcript", TranscriptSchema);
