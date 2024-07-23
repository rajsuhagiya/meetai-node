const mongoose = require("mongoose");
const { Schema } = mongoose;

const RecordStatusSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Record",
  },
  status: {
    type: String,
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("RecordStatus", RecordStatusSchema);
