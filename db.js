const mongoose = require("mongoose");
// const mongoURL = "mongodb://localhost:27017/meetai";
// const mongoURL = "mongodb+srv://meetai:meetai@cluster0.6ujy5fh.mongodb.net/";
const mongoURL =
  "mongodb+srv://meetai:meetai@cluster0.6ujy5fh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectToMongo = () => {
  mongoose.connect(mongoURL);
  console.log("connected to mongoose");
};

module.exports = connectToMongo;
