const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const fetch = require("node-fetch");
const fetchuser = require("../middleware/fetchuser");

// const APIKEY = "f3da1c8372f7d6cb4d1b8f3c4f3ace179ad643e2";
const APIKEY = "29a16e9135f397c745c0aec150651378fd1e4632";

router.get("/getbot", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/createbot", fetchuser, async (req, res) => {});

router.post("/createrecord", fetchuser, async (req, res) => {
  console.log(req.user);
  const { botName, meetingUrl } = req.body;
  //   const url = "https://api.recall.ai/api/v1/bot/";

  const url = "https://us-west-2.recall.ai/api/v1/bot/";
  const options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      Authorization: APIKEY,
    },
    body: JSON.stringify({
      bot_name: botName,
      meeting_url: meetingUrl,
    }),
  };
  const result = fetch(url, options)
    .then((res) => res.json())
    .then(async (json) => {
      console.log("-2--");
      console.log(json);
      if (json.id) {
        const record = new Record({
          botName,
          meetingUrl,
          botId: json.id,
          user: req.user.id,
        });
        const savedRecord = await record.save();
        res.send(savedRecord);
      }
      console.log("--2-");
    })
    .catch((err) => console.error("error:" + err));

  // res.send(result);
  // return result;
});

module.exports = router;
