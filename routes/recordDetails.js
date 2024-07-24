const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Record = require("../models/Record");
const RecordStatus = require("../models/RecordStatus");
const fetchuser = require("../middleware/fetchuser");
const { format } = require("date-fns");

router.get("/get-record-details/:id", fetchuser, async (req, res) => {
  // try {
  const id = req.params.id;
  const record = await Record.findById(id)
    .populate("folder", "folderName accessType")
    .populate("user", "companyId");

  // userId = req.user.id;
  // const folder = await Folder.create({
  //   folderName: req.body.folderName,
  //   user: userId,
  //   accessType: req.body.accessType,
  // });

  const statusColors = {
    Pending: "yellow",
    Processing: "blue",
    Completed: "green",
  };

  const recordStatusQuery = await RecordStatus.find({
    recordId: record._id,
  }).sort({ createdAt: 1 });
  const recordStatuses = recordStatusQuery.map((rec) => ({
    color: statusColors[rec.status],
    status: rec.status,
    date: format(rec.createdAt, "MMMM dd, yyyy 'at' h:mm a"),
  }));

  const latestRecordQuery = await RecordStatus.find({
    recordId: record._id,
  }).sort({ createdAt: -1 });
  const latestRecord =
    latestRecordQuery.length > 0 ? latestRecordQuery[0] : null;
  const latestStatus = latestRecord ? latestRecord.status : null;

  const recordDetails = {
    id: record._id,
    name: record.meetingName,
    type: record.folder.accessType,
    record: record.videoUrl,
    status: latestStatus,
    date: format(record.joinAt, "MM-dd-yyyy"),
    time: format(record.joinAt, "HH:mm:ss"),
    folder: record.folder.folderName,
    transcript: record.transcript,
    platform: record.platform,
    notes: record.notes,
    summary: record.summary,
    recordStatuses: recordStatuses,
  };
  res.status(200).json({
    success: "Record Details Fetched Successfully",
    status: 200,
    recordDetails,
  });
  // } catch (error) {
  //   res.status(500).json({ error: "Internal Server Error" });
  // }
});

module.exports = router;
