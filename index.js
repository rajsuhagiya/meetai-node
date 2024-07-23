const connectToMongo = require("./db");
const express = require("express");
var cors = require("cors");

connectToMongo();

const app = express();
const port = 4000;
app.use(cors());
//Middleware
app.use(express.json());

//Available Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/records", require("./routes/records"));
app.use("/api/records-details", require("./routes/recordDetails"));
app.use("/api/folders", require("./routes/folders"));
app.use("/api/setting", require("./routes/setting"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.get("/", (req, res) => res.send("Hello World! how are you?"));
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
