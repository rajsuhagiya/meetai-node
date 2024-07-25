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
    let temp_id = user_id;
    if (user.companyId) {
      temp_id = user.companyId;
    }
    const folderCount = await Folder.countDocuments({
      $or: [
        { user: user_id },
        {
          accessType: "public",
          user: { $in: await User.find({ companyId: temp_id }) },
        },
        {
          accessType: "public",
          user: { $in: await User.find({ _id: temp_id }) },
        },
      ],
    });
    const yourCalls = await Record.countDocuments({ user: user_id });

    const teamCalls = await Record.countDocuments({
      user: { $ne: user_id },
      $or: [
        {
          user: { $in: await User.find({ companyId: temp_id }) },
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
        },
        {
          user: { $in: await User.find({ _id: temp_id }) },
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
        },
      ],
    });
    const failedCalls = await Record.countDocuments({
      status: "Failed",
      $or: [
        { user: user_id },
        {
          user: { $in: await User.find({ companyId: temp_id }) },
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
        },
        {
          user: { $in: await User.find({ _id: temp_id }) },
          folder: {
            $in: await Folder.find({
              accessType: "public",
            }),
          },
        },
      ],
    });
    res.status(200).json({
      message: "",
      folderCount,
      yourCalls,
      teamCalls,
      failedCalls,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/get-tally-chart", fetchuser, async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  let temp_id = userId;
  if (user.companyId) {
    temp_id = user.companyId;
  }

  const users = await User.find({
    $or: [{ _id: temp_id }, { companyId: temp_id }],
  }).select("_id name");

  console.log(users);

  const userIds = users.map((user) => user._id);

  const records = await Record.find({
    user: { $in: userIds },
  }).populate("user", "name");

  const userRecordCountMap = {};
  users.forEach((user) => {
    userRecordCountMap[user.name] = 0; // Initialize to 0
  });
  records.forEach((record) => {
    const userName = record.user.name;
    userRecordCountMap[userName]++;
  });

  const names = Object.keys(userRecordCountMap);
  const counts = Object.values(userRecordCountMap);

  console.log("Names:", names);
  console.log("Counts:", counts);

  const data = {
    series: [
      {
        data: counts,
      },
    ],
    options: {
      chart: {
        type: "bar",
        height: 350,
        fontFamily: "Poppins",
        toolbar: {
          show: true,
          tools: {
            download: false,
          },
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          borderRadiusApplication: "end",
          horizontal: true,
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        categories: names,
        style: {
          fontSize: "20px",
          fontWeight: 600,
        },
      },
      colors: ["#a72ee7"],
    },
  };
  res.status(200).json({ data });
});

router.post("/createbot", fetchuser, async (req, res) => {});

module.exports = router;
