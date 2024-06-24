const express = require("express");
const router = express.Router();
const Folder = require("../models/Folder");
const fetchuser = require("../middleware/fetchuser");

router.get("/getDashboard", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const folderCount = await Folder.countDocuments({
      $or: [{ user: userId }, { accessType: "public" }],
    });
    res.status(200).json({ message: "", folderCount });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/createbot", fetchuser, async (req, res) => {});

module.exports = router;
