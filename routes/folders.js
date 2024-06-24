const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Folder = require("../models/Folder");
const fetchuser = require("../middleware/fetchuser");

router.post(
  "/createfolder",
  fetchuser,
  [
    body("folderName", "Folder Name is required").notEmpty(),
    body("accessType", "Access Type is required").notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 400, errors: errors.array() });
      }
      userId = req.user.id;
      const folder = await Folder.create({
        folderName: req.body.folderName,
        user: userId,
        accessType: req.body.accessType,
      });
      res
        .status(200)
        .json({ success: "Folder Added Successfully", status: 200, folder });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get("/getfolders", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const folders = await Folder.find({
      $or: [{ user: userId }, { accessType: "public" }],
    });
    res.send(folders);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
