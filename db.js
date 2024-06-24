const mongoose = require("mongoose");
// const mongoURL = "mongodb://localhost:27017/meetai";
const mongoURL = "mongodb+srv://meetai:meetai@cluster0.6ujy5fh.mongodb.net/";

const connectToMongo = () => {
  mongoose.connect(mongoURL);
  console.log("connected to mongoose");
};

module.exports = connectToMongo;
