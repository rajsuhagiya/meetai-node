const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const Setting = require("../models/Setting");
const Folder = require("../models/Folder");
const { body, validationResult } = require("express-validator");
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

router.get("/getRecords", fetchuser, async (req, res) => {
  const userId = req.user.id;
  const recordQuery = await Record.find({ user: userId });
  console.log(recordQuery);
  // const recordQuery = await Record.find({ user: userId })
  //   .populate("bot", "botName")
  //   .populate("folder", "folderName");
  // console.log(recordQuery);
  // const records = recordQuery.map((record) => ({
  //   meetingName: record.meetingName,
  //   mettingUrl: record.meetingUrl,
  //   bot: record.bot,
  // }));
  // res.status(200).json({ records });
});

router.post(
  "/createrecord",
  fetchuser,
  [
    body("meetingName", "Meeting Name is required").notEmpty(),
    body("meetingUrl", "Meeting URL is required").notEmpty(),
    body("folder", "Folder Name is required").notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 400, errors: errors.array() });
      }
      const { meetingName, meetingUrl, folder } = req.body;
      userId = req.user.id;
      const bot = await Setting.findOne({
        user: userId,
      });
      if (bot) {
        const url = "https://us-west-2.recall.ai/api/v1/bot/";
        const options = {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: APIKEY,
          },
          body: JSON.stringify({
            bot_name: bot.botName,
            meeting_url: meetingUrl,
          }),
        };
        const result = fetch(url, options)
          .then((res) => res.json())
          .then(async (json) => {
            // console.log(json);
            if (json.id) {
              const record = new Record({
                meetingName,
                meetingUrl,
                bot: bot._id,
                folder: folder,
                user: req.user.id,
              });
              const savedRecord = await record.save();
              res.send(savedRecord);
            }
          })
          .catch((err) => console.error("error:" + err));
        res
          .status(200)
          .json({ status: 200, success: "Meeting Created Successfully" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = router;
