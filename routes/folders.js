const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Record = require("../models/Record");
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
  // try {
  user_id = req.user.id;
  const user = await User.findById(user_id);

  const foldersQuery = await Folder.find({
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

  const folders = await Promise.all(
    foldersQuery.map(async (folder) => {
      const countRecord = await Record.countDocuments({ folder: folder._id });
      return {
        ...folder.toObject(),
        countRecord,
      };
    })
  );

  res.send(folders);
  // } catch (error) {
  //   res.status(500).json({ error: "Internal Server Error" });
  // }
});

router.post("/update-folder/:id", fetchuser, async (req, res) => {
  const folder = await Folder.findById(req.params.id);
  folder.folderName = req.body.folderName;
  folder.accessType = req.body.accessType;
  folder.save();
  res
    .status(200)
    .json({ success: "Folder Updated Successfully", status: 200, folder });
});

module.exports = router;
