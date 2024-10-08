const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const RecordStatus = require("../models/RecordStatus");
const Setting = require("../models/Setting");
const User = require("../models/User");
const Folder = require("../models/Folder");
const { body, validationResult } = require("express-validator");
const fetch = require("node-fetch");
const fetchuser = require("../middleware/fetchuser");
const fs = require("fs");
const ytdl = require("ytdl-core");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const https = require("https");
const { format } = require("date-fns");
const cloudinary = require("cloudinary").v2;
const OpenAI = require("openai");
require("dotenv").config();

const { type } = require("os");

const Recall = "us-west-2.recall.ai";
// myapiKey
// const APIKEY = "f3da1c8372f7d6cb4d1b8f3c4f3ace179ad643e2";
// const APIKEY = "29a16e9135f397c745c0aec150651378fd1e4632";

console.log(process.env.GPT);
const openai = new OpenAI({
  apiKey: process.env.GPT,
});

router.get("/chatgpt", fetchuser, async (req, res) => {
  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: "how are you",
      },
    ],
    model: "gpt-4o-mini",
  });
  if (response.choices && response.choices.length > 0) {
    const summary = response.choices[0].message.content;
    res.status(200).json({ summary });
  }
});

router.get("/getbot", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/getRecords", fetchuser, async (req, res) => {
  const status = req.body.status;
  const userId = req.user.id;
  const user = await User.findById(userId);
  let temp_id = userId;
  if (user.companyId) {
    temp_id = user.companyId;
  }
  // const publicFolders = await Folder.find({ accessType: "public" });
  // console.log(publicFolders);
  let recordQuery = "";
  if (status == "all-calls") {
    recordQuery = await Record.find({
      $or: [
        { user: userId }, // Records belonging to the logged-in user
        {
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
          user: {
            $in: await User.find({
              companyId: temp_id,
            }),
          },
        },
        {
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
          user: {
            $in: await User.find({
              _id: temp_id,
            }),
          },
        },
      ],
    })
      .populate("folder", "folderName accessType")
      .populate("user", "companyId");
  } else if (status == "your-calls") {
    recordQuery = await Record.find({
      user: userId,
    })
      .populate("folder", "folderName accessType")
      .populate("user", "companyId");
  } else if (status == "team-calls") {
    recordQuery = await Record.find({
      user: { $ne: userId },
      $or: [
        {
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
          user: {
            $in: await User.find({
              companyId: temp_id,
            }),
          },
        },
        {
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
          user: {
            $in: await User.find({
              _id: temp_id,
            }),
          },
        },
      ],
    })
      .populate("folder", "folderName accessType")
      .populate("user", "companyId");
  } else {
    recordQuery = await Record.find({
      status: "Failed",
      $or: [
        { user: userId },
        {
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
          user: {
            $in: await User.find({
              companyId: temp_id,
            }),
          },
        },
        {
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
          user: {
            $in: await User.find({
              _id: temp_id,
            }),
          },
        },
      ],
    })
      .populate("folder", "folderName accessType")
      .populate("user", "companyId");
  }

  const records = recordQuery.map((record) => ({
    id: record._id,
    folderId: record.folder._id,
    name: record.meetingName,
    type: record.folder.accessType,
    record: record.videoUrl,
    status: record.status,
    platform: record.platform,
    date: format(record.joinAt, "MM-dd-yyyy"),
    time: format(record.joinAt, "h:mm a"),
    folder: record.folder.folderName,

    action: record.user._id == userId ? true : false,
  }));
  res.status(200).json({ recordQuery, records });
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
              if (savedRecord) {
                const recordStatus = new RecordStatus({
                  user: req.user.id,
                  recordId: record._id,
                });
                await recordStatus.save();
              }
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

router.post("/raj", async (req, res) => {
  cloudinary.config({
    cloud_name: "dbthjxcj7",
    api_key: "288821489515297",
    api_secret: "u6ud3EKR6A8BWCxVZfMdNUCTxdc", // Click 'View Credentials' below to copy your API secret
  });
  const uniqueNumber = Date.now();
  // Upload an image
  const uploadResult = await cloudinary.uploader
    .upload(
      "https://us-west-2-recallai-production-bot-data.s3.amazonaws.com/03dad7d8-dcbf-4908-bb1d-60f89f0ad7b0/AROA3Z2PRSQANGTUQXHNJ%3Ai-0a828fccb7d897648/video-690afef7-0287-4fdb-828b-48bd535397a5.mp4?AWSAccessKeyId=ASIA3Z2PRSQACX3A2H4S&Signature=qTj4oZjHBn8O8bfn145luho%2BUiY%3D&x-amz-security-token=IQoJb3JpZ2luX2VjED4aCXVzLXdlc3QtMiJGMEQCIQDsrI5EbNFQNX6i6yj0hONBsG4Mgk4DEzjEXB%2BnkyDXWAIfO2QjmzGduDR99Azd1v%2F4ZboT5FZLH2MyOZMHYqeReSq6BQgXEAAaDDgxMTM3ODc3NTA0MCIMndhaBVy%2BIGBe5igUKpcF7v1mcZAhb7gbM%2Fd56waR24MUwnWsnUxpS3Awbn4gIBscP8BBZS3FLJaGJa8elCyhArk5xJcYzdXUI%2Bpu8%2FGKlPxb5uW%2Br7tnG%2B6fxGotpHvprroHDtsMQczF4c7VslBpNXPrP86MCcgfeQpsJN%2B%2FuodSz1ZewbZBot0amqeISLd%2BLlVT21Qm1MxqL1qjMZ0fXHTObk6510Ft6DeCBHQokHEOcVDkezEqKsAGsyfP2RgKVcfqUoqHxI1k0s2vEacKtEEWbX5A5pEvv4nJQPocaaWeoONUrfNwmEGXLzSI0IUT7LiPU80r1JbDSdZ59DC0T9Kw6NPYXPDa3AuGJiZdpXNlNuPtC5iBhQCLQ7DMI9od5irRtbkhdC6bB8azmub5pgRI82V5FurF%2FJo2EpF8y9sl6PXKXiqwDTJUBhkWXp2b9LgwnY%2Fn%2FChMhpl2lhsCiTyh5C8queQBm1ZKmtKx5oslbMzLbQhptqX1jEIitwFhkUHbZE10xGOimBi1deatsXHEYxqQD2QSG0dkP6MX6CUnceNTANbViDSKfMOdyrjwfDNc5jpLY2zAuAPBMIN762ETbCwIRF2kMjLh87Cg9Pznv0QMGyAJQsPceX2w9%2FmZFBmATG3TjOkKg0wtJo20%2BO1PpZcE53cr%2BWtr5S2H4Bt6OWcdMoNTZBDgnNKFLrz9QLiR9Y9oLiAF34sEpXaevIS7Aa58NeHuGZjX8Z%2Fzj%2BWhB%2FVb1%2FfBHE7tbP2ATVo4NhRvg4nnaRGTrwDZ9eEWlxX8z3f9cGUPseIxP5nWLonmR844IZVuxKx6fFPCLMciF0hzY0cdlcUaK0Cp2%2F4jEwnqgHBE0bxqKAgWYWglmDNdNMJoMMP2unM2SU3%2F68XdmpsrkF2tMJGv5LQGOrIBwps7UxgOlbbVSvvL1XANB%2Bri09w9H9DZaF5NcqheIRLLsPaBN0%2BjKSMPLtsY9pCZqWGZaOqqJh%2BFHjRChdmAlaWEWPmMeVqEzMYcvQmdyr3oCcUSyXofr1bERzvf6qSV0MsXzg4F240c2Hrg6kJMlMG90IfncLBa21f0VHEFPkarXam7%2BXniK9X5Aj%2FIBxyXNQQPHTzkAhQoBWVJdNer5sHjIU7J4TcmnxlgzfNLSgp0Ug%3D%3D&Expires=1721348542",

      {
        asset_folder: "records",
        resource_type: "video",
        public_id: `record-${uniqueNumber}`,
      }
    )
    .catch((error) => {
      console.log(error);
    });

  console.log(uploadResult);
});

router.get("/trans", async (req, res) => {
  // const findRecordStatus = await RecordStatus.findOne({
  //   user: "66883dd7c13e6c08bd7a3a35",
  //   recordId: "66a1104fd6ac25dae545673c",
  //   status: "pending",
  // });
  if (!findRecordStatus) {
    // const recordStatus = new RecordStatus({
    //   user: "66883dd7c13e6c08bd7a3a35",
    //   recordId: "66a1104fd6ac25dae545673c",
    //   status: "Processing",
    // });
    // await recordStatus.save();
  }
  res.status(200).json({ findRecordStatus });
});

router.delete("/deleteRecord/:id", fetchuser, async (req, res) => {
  try {
    console.log(req.params.id);
    let record = await Record.findOne({ _id: req.params.id });
    console.log(record);
    if (!record) {
      return res.status(404).json({ error: "Not Found" });
    }
    record = await Record.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Record Deleted Successfully", record });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/share-meeting", fetchuser, async (req, res) => {
  try {
    const { recordId, folderId } = req.body;
    const findRecord = await Record.findById(recordId);
    if (findRecord) {
      findRecord.folder = folderId;
      await findRecord.save();
    }
    res.status(200).json({ message: "Record Shared Successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/webhooks", async (req, res) => {
  try {
    console.log(req.body.data.status.code, "-----------call_ended");
    // setTimeout(async () => {
    let bot_id = req.body.data.bot_id;
    if (req.body.data.status.code === "call_ended") {
      console.log(req.body);
      const findRecord = await Record.findOne({
        botId: req.body.data.bot_id,
      });
      if (findRecord) {
        const findRecordStatus = await RecordStatus.findOne({
          user: findRecord.user,
          recordId: findRecord._id,
          status: "Processing",
        });
        if (!findRecordStatus) {
          const recordStatus = new RecordStatus({
            user: findRecord.user,
            recordId: findRecord._id,
            status: "Processing",
          });
          await recordStatus.save();
        }
        // findRecord.status = req.body.data.status.code;
        // await findRecord.save();
        // console.log("Record updated successfully:", findRecord);
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
            if (json.meeting_url && json.meeting_url.platform) {
              findRecord.platform = json.meeting_url.platform;
            }
            if (json.video_url) {
              // console.log(json);
              const uniqueNumber = Date.now();
              findRecord.status = "Completed";
              findRecord.videoUrl = `record-${uniqueNumber}`;
              if (
                json.recordings &&
                Array.isArray(json.recordings) &&
                json.recordings.length > 0 &&
                json.recordings[0].started_at &&
                json.recordings[0].completed_at
              ) {
                const { started_at, completed_at } = json.recordings[0];
                const durationMs =
                  new Date(completed_at) - new Date(started_at);

                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor(
                  (durationMs % (1000 * 60 * 60)) / (1000 * 60)
                );
                const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

                const formattedDuration = [
                  hours > 0 ? `${hours}h` : null,
                  minutes > 0 ? `${minutes}m` : null,
                  seconds > 0 ? `${seconds}s` : null,
                ]
                  .filter(Boolean)
                  .join(" ");

                console.log(formattedDuration, "duration");
                findRecord.duration = formattedDuration;
              }
              await findRecord.save();
              // const recordCompleted = new RecordStatus({
              //   user: findRecord.user,
              //   recordId: findRecord._id,
              //   status: "Completed",
              // });
              // await recordCompleted.save();
              const recordCompleted = await RecordStatus.findOne({
                user: findRecord.user,
                recordId: findRecord._id,
                status: "Completed",
              });
              if (!recordCompleted) {
                const recordStatus = new RecordStatus({
                  user: findRecord.user,
                  recordId: findRecord._id,
                  status: "Completed",
                });
                await recordStatus.save();
              }
              console.log("Record Saved ---");
              cloudinary.config({
                cloud_name: "dbthjxcj7",
                api_key: "288821489515297",
                api_secret: "u6ud3EKR6A8BWCxVZfMdNUCTxdc", // Click 'View Credentials' below to copy your API secret
              });
              // Upload an image
              const uploadResult = await cloudinary.uploader
                .upload(json.video_url, {
                  asset_folder: "records",
                  resource_type: "video",
                  public_id: `record-${uniqueNumber}`,
                })
                .catch((error) => {
                  console.log(error);
                });

              res.status(200).json({ message: "Record Saved" });
            }
          })
          .catch((err) => {
            console.error("Error fetching bot data:", err);
            res.status(500).json({ error: "Error fetching bot data" });
          });

        //get transcibe
        const transcriptUrl = `https://${Recall}/api/v1/bot/${bot_id}/transcript`;
        const transcriptOptions = {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: APIKEY,
          },
        };

        fetch(transcriptUrl, transcriptOptions)
          .then((response) => response.json())
          .then(async (json) => {
            console.log(json, "get_tanscript");
            let transcript = "";
            if (json.length > 0) {
              transcript = json
                .map((entry) => {
                  const speakerText = entry.words
                    .map((word) => word.text)
                    .join(" ");
                  return `${entry.speaker}: ${speakerText}`;
                })
                .join("\n");
              findRecord.transcript = transcript;
              if (transcript) {
                console.log("added a trans");
                const response = await openai.chat.completions.create({
                  messages: [
                    {
                      role: "user",
                      content: `${transcript} - Please provide a concise summary of this transcript.`,
                      max_tokens: 100,
                    },
                  ],
                  model: "gpt-4o-mini",
                });
                const des = response.choices[0].message;
                if (response.choices && response.choices.length > 0) {
                  const summary = response.choices[0].message.content;
                  findRecord.summary = summary;
                  console.log("summary Saved by gpt-4");
                }
              }
              console.log("Transcipt Saved");
            }
            await findRecord.save();
          })
          .catch((err) => {
            console.error("Error fetching bot data:", err);
            res.status(500).json({ error: "Error fetching bot data" });
          });

        //end transcrbe
      }
      // await findRecord.save();
      console.log("final save", "fffffffffffff");
    } else if (req.body.data.status.code === "fatal") {
      console.log(req.body, "fatal body");
      const findRecord = await Record.findOne({
        botId: req.body.data.bot_id,
      });
      if (findRecord) {
        (findRecord.status = "Failed"), await findRecord.save();
        const recordStatus = new RecordStatus({
          user: findRecord.user,
          recordId: findRecord._id,
          status: "Failed",
        });
        await recordStatus.save();
      }
    }
    // }, 60);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
