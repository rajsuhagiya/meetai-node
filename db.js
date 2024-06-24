const mongoose = require("mongoose");
const mongoURL = "mongodb://localhost:27017/meetai";

const connectToMongo = () => {
  mongoose.connect(mongoURL);
  console.log("connected to mongoose");
};

module.exports = connectToMongo;
