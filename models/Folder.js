const mongoose = require("mongoose");
const { Schema } = mongoose;

const FoldersSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  folderName: {
    type: String,
    required: true,
  },
  accessType: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("folders", FoldersSchema);
