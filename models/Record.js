const mongoose = require("mongoose");
const { Schema } = mongoose;

const RecordsSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  botName: {
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

  joinAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("records", RecordsSchema);
