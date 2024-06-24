const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobileNumber: {
    type: String,
  },
  type: {
    type: String,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  password: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "active",
  },
  role: {
    type: Number,
    default: 2,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// const User = mongoose.model("user", UserSchema);
// User.createIndexes();
// module.exports = User;
module.exports = mongoose.model("user", UserSchema);
