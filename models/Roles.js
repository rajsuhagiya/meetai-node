const mongoose = require("mongoose");
const { Schema } = mongoose;

const RoleSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Roles", RoleSchema);
