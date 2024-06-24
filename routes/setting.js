const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Setting = require("../models/Setting");
const fetch = require("node-fetch");
const fetchuser = require("../middleware/fetchuser");

router.post("/getsetting", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const setting = await Setting.findOne({ user: userId });
    const data = {
      botName: setting?.botName || "",
      _id: setting?._id || "",
    };
    console.log(data, "???");
    // if (!setting) {
    //   return res.status(404).json({ error: "Setting not found", response });
    // }

    res.status(200).json({ status: 200, data });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/updatesetting", fetchuser, async (req, res) => {
  try {
    const { id, botName } = req.body;
    const editSetting = {};
    if (botName) {
      editSetting.botName = botName;
    }

    let setting;
    if (id) {
      // Update the Setting or create a new one if it doesn't exist
      setting = await Setting.findOneAndUpdate(
        { _id: id }, // Filter to find the setting by its ID
        { $set: editSetting }, // Update fields specified in editSetting
        { new: true } // Return the modified document after update and create a new one if it doesn't exist
      );
    } else {
      setting = await Setting.create({
        botName,
        user: req.user.id,
      });
    }

    console.log(setting);
    res
      .status(200)
      .json({ success: "Setting Updated Successfully", status: 200, setting });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
