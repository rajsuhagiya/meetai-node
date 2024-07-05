const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const RecordDetails = require("../models/RecordDetails");
const Setting = require("../models/Setting");
const Folder = require("../models/Folder");
const { body, validationResult } = require("express-validator");
const fetch = require("node-fetch");
const fetchuser = require("../middleware/fetchuser");
const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");

const Recall = "us-west-2.recall.ai";
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
        const url = `https://${Recall}/api/v1/bot/`;
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
            // console.log(json, "ffffffffff");
            if (json.id) {
              const record = new Record({
                meetingName,
                meetingUrl,
                bot: bot._id,
                botId: json.id, //bot-id for webhook
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

const storeVideo = (video_url) => {
  const dir = path.join(__dirname, "..", "public", "records");

  // Check if the directory exists, if not, create it
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generate a unique filename using the current time in milliseconds
  const uniqueNumber = Date.now();
  const filename = `record-${uniqueNumber}.mp4`;
  const filePath = path.join(dir, filename);
  ytdl(`${video_url}`).pipe(fs.createWriteStream(filePath));
  return filename;
};

router.get("/demo", (req, res) => {
  const dir = path.join(__dirname, "..", "public", "records");

  // Check if the directory exists, if not, create it
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generate a unique filename using the current time in milliseconds
  const uniqueNumber = Date.now();
  const filename = `record-${uniqueNumber}.mp4`;
  const filePath = path.join(dir, filename);
  ytdl("https://www.youtube.com/shorts/MLMZK82lXqc").pipe(
    fs.createWriteStream(filePath)
  );
  return filename;
});

router.post("/webhooks", async (req, res) => {
  try {
    setTimeout(async () => {
      let bot_id = req.body.data.bot_id;
      if (
        req.body.event === "done" ||
        req.body.data.status.code === "call_ended"
      ) {
        console.log(req.body);
        const findRecord = await Record.findOne({
          botId: req.body.data.bot_id,
        });
        if (findRecord) {
          findRecord.status = req.body.data.status.code;
          await findRecord.save();
          console.log("Record updated successfully:", findRecord);
          const url = `https://${Recall}/api/v1/bot/${bot_id}/`;
          const options = {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: APIKEY,
            },
          };

          fetch(url, options)
            .then((response) => response.json())
            .then(async (json) => {
              console.log(json, "bot_get_data");
              if (json.video_url) {
                const videoUrl = storeVideo(json.video_url);
                console.log(videoUrl, "-------");
                if (videoUrl) {
                  findRecord.videoUrl = videoUrl;
                  await findRecord.save();
                  console.log("Record Saved");
                }
                res.status(200).json({ message: "Record Saved" });
              }
            })
            .catch((err) => {
              console.error("Error fetching bot data:", err);
              res.status(500).json({ error: "Error fetching bot data" });
            });
        }
      }
    }, 60);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
