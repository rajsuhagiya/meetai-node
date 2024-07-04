const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const RecordDetails = require("../models/RecordDetails");
const Setting = require("../models/Setting");
const Folder = require("../models/Folder");
const { body, validationResult } = require("express-validator");
const fetch = require("node-fetch");
const fetchuser = require("../middleware/fetchuser");

const APIKEY = "f3da1c8372f7d6cb4d1b8f3c4f3ace179ad643e2";
// const APIKEY = "29a16e9135f397c745c0aec150651378fd1e4632";

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
            transcription_options: { provider: "meeting_captions" },
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

router.post("/webhooks", async (req, res) => {
  try {
    console.log(req.body);
    setTimeout(async () => {
      if (req.body.data && req.body.data.bot_id) {
        findRecord = Record.findById(req.body.data.bot_id);
        if (findRecord) {
          findRecord.status = req.body.data.status.code;
          await findRecord.save();
          console.log("Record updated successfully:", findRecord);
        }
      }
    }, 180000); // 180 seconds delay
    // setTimeout(async () => {
    //   if (
    //     req.body.event === "done" ||
    //     req.body.data.status.code === "call_ended"
    //   ) {
    //     await reCallAiService.changeMeetingStatus(req.body.data.bot_id);
    //   }
    // }, 180000); // 180 seconds delay

    // console.log(req.body, "-------");

    // if (req.body.data.status.code === "fatal") {
    //   const record = await Record.findOne({
    //     recall_bot_id: req.body.data.bot_id,
    //     recall_bot_id: { $ne: null },
    //   });
    //   if (record) {
    //     await RecordDetails.create({
    //       user_id: record.user_id,
    //       client_id: record.client_id,
    //       name: record.name,
    //       context: "Call transcript of " + record.name,
    //       data: "",
    //       component: "action-ai",
    //       ai_meeting_id: record._id,
    //       is_private: true,
    //       status: "Completed",
    //       indexing_status: "Completed",
    //       is_url: false,
    //       word_count: 0,
    //     });

    //     await Record.updateOne({ status: "Failed" });
    //   }
    // }

    // res.status(200).json({
    //   message: "Meeting status changed successfully.",
    //   data: [],
    //   status: 200,
    // });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
