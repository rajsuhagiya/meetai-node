const express = require("express");
const User = require("../models/User");
const Setting = require("../models/Setting");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetchuser = require("../middleware/fetchuser");

const router = express.Router();

const JWT_SECRET = "https.meetai";

// ROUTE 1: Create a User using: POST "/api/auth/createuser" - No Login Required
router.post(
  "/createuser",
  [
    body("name", "Name must be 3 charachters").isLength({ min: 3 }),
    body("email", "Enter a Valid Email").isEmail(),
    body("password", "Password must be 5 charachters").isLength({ min: 5 }),
  ],
  async (req, res) => {
    try {
      let success = false;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res
          .status(400)
          .json({ error: "User with this email is alredy exists" });
      }
      const salt = bcrypt.genSaltSync(10);
      secPass = bcrypt.hashSync(req.body.password, salt);

      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: secPass,
        type: "company",
      });

      console.log("User created successfully:", user);
      if (user) {
        await Setting.create({
          botName: user.name + `'s Bot`,
          user: user.id,
        });
      }
      const data = {
        user: {
          id: user.id,
        },
      };
      const result = {
        email: user.email,
        name: user.name,
      };
      const authtoken = jwt.sign(data, JWT_SECRET);
      success = true;
      // res.status(200).json({ message: "Successfully created a user" });
      res.status(200).json({ success, authtoken, result });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ROUTE 2: Authenticate a User using: POST "/api/auth/login" - No Login Required
router.post(
  "/login",
  [
    body("email", "Enter a Valid Email").isEmail(),
    body("password", "Password can not be blank").exists(),
  ],
  async (req, res) => {
    try {
      let success = false;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email, password } = req.body;
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({
          error: "Please try to login with correct credentials",
        });
        // .json({ error: "email and password is incorrect" });
      }
      const passwordCompare = bcrypt.compareSync(password, user.password);
      if (!passwordCompare) {
        return res
          .status(400)
          .json({ error: "email and password is incorrect" });
      }
      const data = {
        user: {
          id: user.id,
        },
      };
      const result = {
        email: user.email,
        name: user.name,
      };
      const authtoken = jwt.sign(data, JWT_SECRET);
      success = true;
      res.status(200).json({ success, authtoken, result });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// ROUTE 3: Get login user details using: POST "/api/auth/getuser" - Login Required

router.post("/getuser", fetchuser, async (req, res) => {
  try {
    userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ROUTE 4: Edit user details using : PUT "/updateuser/:id" - Login Required
router.put(
  "/editUser/:id",
  fetchuser,
  // [param("id", "Enter a Valid Id").exists()],
  async (req, res) => {
    try {
      // const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({ errors: errors.array() });
      // }
      // console.log(req.body);
      const { name, email, mobileNumber } = req.body;
      const editUser = {};
      if (name) {
        editUser.name = name;
      }
      if (email) {
        editUser.email = email;
      }
      if (mobileNumber) {
        editUser.mobileNumber = mobileNumber;
      }

      // Find the user to be updated
      let user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).send("Not Found");
      }

      user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: editUser },
        { new: true }
      );
      // res.json(user);
      return res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.post("/addUser", fetchuser, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ error: "User with this email is alredy exists" });
    }
    const salt = bcrypt.genSaltSync(10);
    console.log(req.body);
    secPass = bcrypt.hashSync(password, salt);
    console.log("hee");
    user = await User.create({
      name: name,
      email: email,
      password: secPass,
      companyId: req.user.id,
      type: "individual",
    });
    console.log(user);
    console.log("User created successfully:", user);
    if (user) {
      await Setting.create({
        botName: user.name + `'s Bot`,
        user: user.id,
      });
    }
    const result = {
      email: user.email,
      name: user.name,
    };
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/deleteUser/:id", fetchuser, async (req, res) => {
  try {
    console.log(req.params.id);
    let user = await User.findOne({ _id: req.params.id });
    console.log(user);
    if (!user) {
      return res.status(404).json({ error: "Not Found" });
    }
    user = await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User Deleted Successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/getIndividualUser", fetchuser, async (req, res) => {
  try {
    const userId = req.user.id;
    const usersQuery = await User.find({ companyId: userId }).select(
      "-password -role"
    );

    const users = usersQuery.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber || "N/A",
      status: user.status,
      type: user.type,
      companyId: user.companyId,
    }));
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put(
  "/change-password",
  fetchuser,
  [
    body("password", "Password must be at least 5 characters").isLength({
      min: 5,
    }),
    body("npassword", "New password must be at least 5 characters").isLength({
      min: 5,
    }),
    body(
      "cpassword",
      "Confirm password must be at least 5 characters"
    ).isLength({ min: 5 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      // if (!errors.isEmpty()) {
      //   return res.status(400).json({ errors: errors.array() });
      // }

      const { password, npassword, cpassword } = req.body;

      if (npassword !== cpassword) {
        return res
          .status(400)
          .json({ error: "New password and confirm password do not match" });
      }

      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({ error: "Old password is incorrect" });
      }

      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(npassword, salt);

      user.password = secPass;
      await user.save();

      res
        .status(200)
        .json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error(error); // Log the error for debugging purposes
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = router;
