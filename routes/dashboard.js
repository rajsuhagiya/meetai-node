const express = require("express");
const router = express.Router();
const Folder = require("../models/Folder");
const User = require("../models/User");
const fetchuser = require("../middleware/fetchuser");
const Record = require("../models/Record");

router.get("/getDashboard", fetchuser, async (req, res) => {
  try {
    user_id = req.user.id;
    const user = await User.findById(user_id);
    const folderCount = await Folder.countDocuments({
      $or: [
        { user: user_id },
        {
          accessType: "public",
          user: { $in: await User.find({ companyId: user_id }) },
        },
        {
          accessType: "public",
          user: { $in: await User.find({ _id: user.companyId }) },
        },
      ],
    });
    const yourCalls = await Record.countDocuments({ user: user_id });
    res.status(200).json({
      message: "",
      folderCount,
      yourCalls,
      teamCalls: 0,
      failedCalls: 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/createbot", fetchuser, async (req, res) => {});

module.exports = router;
