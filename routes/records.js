const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const RecordDetails = require("../models/RecordDetails");
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

const { type } = require("os");

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
  console.log("---------");
  const userId = req.user.id;
  const publicFolders = await Folder.find({ accessType: "public" });
  console.log(publicFolders);

  const recordQuery = await Record.find({
    $or: [
      { user: userId }, // Records belonging to the logged-in user
      {
        $and: [
          {
            folder: {
              $in: await Folder.find({
                accessType: "public",
              }),
            },
            user: {
              $in: await User.find({
                companyId: userId,
              }),
            },
          }, // Folder type is public and belongs to the company
        ],
      },
    ],
  })
    .populate("folder", "folderName accessType")
    .populate("user", "companyId");
  console.log(recordQuery);
  const records = recordQuery.map((record) => ({
    name: record.meetingName,
    type: record.folder.accessType,
    status: record.status,
    date: format(record.joinAt, "MM-dd-yyyy"),
    time: format(record.joinAt, "HH:mm:ss"),
    folder: record.folder.folderName,
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
  const dir = path.join(__dirname, "..", "records");

  // Check if the directory exists, if not, create it
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generate a unique filename using the current time in milliseconds
  const uniqueNumber = Date.now();
  const filename = `record-${uniqueNumber}.mp4`;
  const filePath = path.join(dir, filename);
  // ytdl(`${video_url}`).pipe(fs.createWriteStream(filePath));
  const file = fs.createWriteStream(filePath);
  const request = https.get(video_url, function (response) {
    response.pipe(file);
  });
  return filename;
};

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

router.get("/demo", async (req, res) => {
  // const dir = path.join(__dirname, "..", "public", "records");

  // // Check if the directory exists, if not, create it
  // if (!fs.existsSync(dir)) {
  //   fs.mkdirSync(dir, { recursive: true });
  // }

  // // Generate a unique filename using the current time in milliseconds
  // const uniqueNumber = Date.now();
  // const filename = `record-${uniqueNumber}.mp4`;
  // const filePath = path.join(dir, filename);
  const url =
    "https://us-west-2-recallai-production-bot-data.s3.amazonaws.com/35be85a7-2b92-415a-86da-fbf34cf5d836/AROA3Z2PRSQANGTUQXHNJ%3Ai-0b735182ecb6f2571/video-c4ab2310-2419-4cae-88d4-45b7c3013b2b.mp4?AWSAccessKeyId=ASIA3Z2PRSQAJYWK5HGG&Signature=CbAPUGyv2BNyrU16ySYPDqeDNAM%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEAYaCXVzLXdlc3QtMiJHMEUCIAk%2Fkxpxa1C3f%2BtauEgyTHi35uFJlHNt3nmhgTKbEY%2B1AiEA3Lhl6XA1805MnceLtQRnU0PMKtH4RTmb8v1o5hvnhnsqwgUIv%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw4MTEzNzg3NzUwNDAiDGZCsS5D%2FmKq3tJehiqWBSdqLkdYqVHt6Hyd8jP264Uo8znbMY5fQt2S20UhWNgP70PWKN44RcjR%2FCQkoJxcQsoi31BYM9xJDWWQ6VMTKiLQOWA8hIijyaETFlIt6MI%2FJFBKTZNfY2Kprj2Hy5fffTw%2FnzMlAv7WcTt8ntqkhgznsalL0zvn12N%2BJrEtCQBGtajTMYKzTPLk4PPj%2FdtDAbn87FqxmsZKOiLHFBPKdi5TE%2BhDsYA4OFTkO3yFC%2BZysvKY1GVmyz9PtFCowI8c2%2FytMXARq%2BziUT%2F%2BLnITFzujbraIijA%2BZiFqNb4hJry93ajde1I0dtQvum5AKyIe%2B61KVuxOTJ%2Fp3lWC4o0cG2ISIhIxcRLDeuLo8SjXrziZ5B5eYUCDpYHDQbmm9%2BMfygoivVHS9aMwXjZ2C8Q2DOBovkuxDOCELKYpCEilNRYmtvZIlzsJc%2FXgARi1TU0Rm0ZvVQVa0Qq1j6rwkpGT6HxrPasyfmf4QDQ90M27DtDpRoHrPjaO9lUVqRyaSmKGdo8D8EP6fKBj0AGk7fBVdYudCHe1ccgx2NE1ZHhLMhvb40fG3p4i5HEarfe4Am%2Bxf1gT3UBtUVHhZVO6ydSkjE21lJYEaIaOnns3VUD3rpWO%2BBhJuVvn%2FLHRSo%2FubJa9muBuj5ntoTA9aD0TGMtrqPeLdf6RJDFKBoFy48XibVyIRN30xgerJL5Fm%2FzoG6gIrSb2c%2Bb%2ByOmChAMuT57QogYwdC1%2BaqotW4%2BFCeF9mO2UaYZN4pKa1V1oA2s9h8D1IrYpmZTVcOAdx7Bz%2FQeHpVrqxPcekOCjsOVho%2F2HFkxe91tlejuk%2Feoe4PPvdY3QYeC1ZxVslfiUOaxeKUOEk3mLbnGf2UZfa7GvJKv%2BsoJrtA9PpK58MMfrn7QGOrEBryBf1vQxc3%2FvhyG2xWQA9RMLMaV2gFrKsVykh%2BVtZWbdEDmFxtu1OXnvqBpibF83PZY3CZLeWP8VBO1mU1ExgD%2B712EOtslTK2DC76TPPM7Aieir9P3eTQdNyJEKwZKQXg1Q%2BRBRKCOjNur8rZiF6Ra5Cg87%2BPau086Dj%2FdwfpXVRPDAfdb3MW5XiDhtxpmNF67eyJLdaD%2BW3vKeoGbOwKbI9LChBUnMTenCMzJPxunV&Expires=1720214972";
  // ytdl(
  //   "https://us-west-2-recallai-production-bot-data.s3.amazonaws.com/35be85a7-2b92-415a-86da-fbf34cf5d836/AROA3Z2PRSQANGTUQXHNJ%3Ai-0b735182ecb6f2571/video-c4ab2310-2419-4cae-88d4-45b7c3013b2b.mp4?AWSAccessKeyId=ASIA3Z2PRSQAJYWK5HGG&Signature=CbAPUGyv2BNyrU16ySYPDqeDNAM%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEAYaCXVzLXdlc3QtMiJHMEUCIAk%2Fkxpxa1C3f%2BtauEgyTHi35uFJlHNt3nmhgTKbEY%2B1AiEA3Lhl6XA1805MnceLtQRnU0PMKtH4RTmb8v1o5hvnhnsqwgUIv%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw4MTEzNzg3NzUwNDAiDGZCsS5D%2FmKq3tJehiqWBSdqLkdYqVHt6Hyd8jP264Uo8znbMY5fQt2S20UhWNgP70PWKN44RcjR%2FCQkoJxcQsoi31BYM9xJDWWQ6VMTKiLQOWA8hIijyaETFlIt6MI%2FJFBKTZNfY2Kprj2Hy5fffTw%2FnzMlAv7WcTt8ntqkhgznsalL0zvn12N%2BJrEtCQBGtajTMYKzTPLk4PPj%2FdtDAbn87FqxmsZKOiLHFBPKdi5TE%2BhDsYA4OFTkO3yFC%2BZysvKY1GVmyz9PtFCowI8c2%2FytMXARq%2BziUT%2F%2BLnITFzujbraIijA%2BZiFqNb4hJry93ajde1I0dtQvum5AKyIe%2B61KVuxOTJ%2Fp3lWC4o0cG2ISIhIxcRLDeuLo8SjXrziZ5B5eYUCDpYHDQbmm9%2BMfygoivVHS9aMwXjZ2C8Q2DOBovkuxDOCELKYpCEilNRYmtvZIlzsJc%2FXgARi1TU0Rm0ZvVQVa0Qq1j6rwkpGT6HxrPasyfmf4QDQ90M27DtDpRoHrPjaO9lUVqRyaSmKGdo8D8EP6fKBj0AGk7fBVdYudCHe1ccgx2NE1ZHhLMhvb40fG3p4i5HEarfe4Am%2Bxf1gT3UBtUVHhZVO6ydSkjE21lJYEaIaOnns3VUD3rpWO%2BBhJuVvn%2FLHRSo%2FubJa9muBuj5ntoTA9aD0TGMtrqPeLdf6RJDFKBoFy48XibVyIRN30xgerJL5Fm%2FzoG6gIrSb2c%2Bb%2ByOmChAMuT57QogYwdC1%2BaqotW4%2BFCeF9mO2UaYZN4pKa1V1oA2s9h8D1IrYpmZTVcOAdx7Bz%2FQeHpVrqxPcekOCjsOVho%2F2HFkxe91tlejuk%2Feoe4PPvdY3QYeC1ZxVslfiUOaxeKUOEk3mLbnGf2UZfa7GvJKv%2BsoJrtA9PpK58MMfrn7QGOrEBryBf1vQxc3%2FvhyG2xWQA9RMLMaV2gFrKsVykh%2BVtZWbdEDmFxtu1OXnvqBpibF83PZY3CZLeWP8VBO1mU1ExgD%2B712EOtslTK2DC76TPPM7Aieir9P3eTQdNyJEKwZKQXg1Q%2BRBRKCOjNur8rZiF6Ra5Cg87%2BPau086Dj%2FdwfpXVRPDAfdb3MW5XiDhtxpmNF67eyJLdaD%2BW3vKeoGbOwKbI9LChBUnMTenCMzJPxunV&Expires=1720214972"
  // ).pipe(fs.createWriteStream(filePath));
  const cloudName = "dbthjxcj7";
  let videoApi = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
  // Configuration
  cloudinary.config({
    cloud_name: "dbthjxcj7",
    api_key: "288821489515297",
    api_secret: "u6ud3EKR6A8BWCxVZfMdNUCTxdc", // Click 'View Credentials' below to copy your API secret
  });

  // Upload an image
  const videoUrl = "https://www.youtube.com/watch?v=paiO6M2wBqE";
  const uniqueNumber = uuidv4();
  const tempFilePath = path.join(__dirname, `video-${uniqueNumber}.mp4`);

  // Download video from YouTube
  const videoStream = ytdl(videoUrl);
  const writeStream = fs.createWriteStream(tempFilePath);

  videoStream.pipe(writeStream);

  writeStream.on("finish", async () => {
    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(tempFilePath, {
        resource_type: "video",
        folder: "video",
      });

      // Remove the local file after upload
      fs.unlinkSync(tempFilePath);

      return res.status(200).send(result);
    } catch (uploadErr) {
      fs.unlinkSync(tempFilePath); // Remove the local file on error as well
      return res.status(500).send(uploadErr);
    }
  });

  writeStream.on("error", (err) => {
    return res.status(500).send(err);
  });

  // console.log(uploadResult);
  // const file = fs.createWriteStream(filePath);
  // const request = https.get(url, function (response) {
  //   response.pipe(file);
  // });
  // return filename;
});

router.get("/demo2", (req, res) => {
  const name = storeVideo(
    "https://us-west-2-recallai-production-bot-data.s3.amazonaws.com/35be85a7-2b92-415a-86da-fbf34cf5d836/AROA3Z2PRSQANGTUQXHNJ%3Ai-0b735182ecb6f2571/video-c4ab2310-2419-4cae-88d4-45b7c3013b2b.mp4?AWSAccessKeyId=ASIA3Z2PRSQAJYWK5HGG&Signature=CbAPUGyv2BNyrU16ySYPDqeDNAM%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEAYaCXVzLXdlc3QtMiJHMEUCIAk%2Fkxpxa1C3f%2BtauEgyTHi35uFJlHNt3nmhgTKbEY%2B1AiEA3Lhl6XA1805MnceLtQRnU0PMKtH4RTmb8v1o5hvnhnsqwgUIv%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw4MTEzNzg3NzUwNDAiDGZCsS5D%2FmKq3tJehiqWBSdqLkdYqVHt6Hyd8jP264Uo8znbMY5fQt2S20UhWNgP70PWKN44RcjR%2FCQkoJxcQsoi31BYM9xJDWWQ6VMTKiLQOWA8hIijyaETFlIt6MI%2FJFBKTZNfY2Kprj2Hy5fffTw%2FnzMlAv7WcTt8ntqkhgznsalL0zvn12N%2BJrEtCQBGtajTMYKzTPLk4PPj%2FdtDAbn87FqxmsZKOiLHFBPKdi5TE%2BhDsYA4OFTkO3yFC%2BZysvKY1GVmyz9PtFCowI8c2%2FytMXARq%2BziUT%2F%2BLnITFzujbraIijA%2BZiFqNb4hJry93ajde1I0dtQvum5AKyIe%2B61KVuxOTJ%2Fp3lWC4o0cG2ISIhIxcRLDeuLo8SjXrziZ5B5eYUCDpYHDQbmm9%2BMfygoivVHS9aMwXjZ2C8Q2DOBovkuxDOCELKYpCEilNRYmtvZIlzsJc%2FXgARi1TU0Rm0ZvVQVa0Qq1j6rwkpGT6HxrPasyfmf4QDQ90M27DtDpRoHrPjaO9lUVqRyaSmKGdo8D8EP6fKBj0AGk7fBVdYudCHe1ccgx2NE1ZHhLMhvb40fG3p4i5HEarfe4Am%2Bxf1gT3UBtUVHhZVO6ydSkjE21lJYEaIaOnns3VUD3rpWO%2BBhJuVvn%2FLHRSo%2FubJa9muBuj5ntoTA9aD0TGMtrqPeLdf6RJDFKBoFy48XibVyIRN30xgerJL5Fm%2FzoG6gIrSb2c%2Bb%2ByOmChAMuT57QogYwdC1%2BaqotW4%2BFCeF9mO2UaYZN4pKa1V1oA2s9h8D1IrYpmZTVcOAdx7Bz%2FQeHpVrqxPcekOCjsOVho%2F2HFkxe91tlejuk%2Feoe4PPvdY3QYeC1ZxVslfiUOaxeKUOEk3mLbnGf2UZfa7GvJKv%2BsoJrtA9PpK58MMfrn7QGOrEBryBf1vQxc3%2FvhyG2xWQA9RMLMaV2gFrKsVykh%2BVtZWbdEDmFxtu1OXnvqBpibF83PZY3CZLeWP8VBO1mU1ExgD%2B712EOtslTK2DC76TPPM7Aieir9P3eTQdNyJEKwZKQXg1Q%2BRBRKCOjNur8rZiF6Ra5Cg87%2BPau086Dj%2FdwfpXVRPDAfdb3MW5XiDhtxpmNF67eyJLdaD%2BW3vKeoGbOwKbI9LChBUnMTenCMzJPxunV&Expires=1720214972"
  );
  res.status(200).json(name);
});

router.post("/webhooks", async (req, res) => {
  try {
    console.log(req.body.event, "-----------event");
    console.log(req.body.data.status.code, "-----------call_ended");
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
                const uniqueNumber = Date.now();
                findRecord.meetingUrl = json.video_url;
                findRecord.videoUrl = `record-${uniqueNumber}`;
                await findRecord.save();
                console.log("Record Saved");
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
        }
      }
    }, 60);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
