const express = require("express");

const router = express.Router();

const User = require("../models/User");

router.get("/", async (req, res) => {

  try {

    const users = await User.find().select("-password");

    res.json(users);

  } catch (err) {

    res.status(500).json({
      message: "Server Error",
    });

  }
});

module.exports = router;