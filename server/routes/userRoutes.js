const express = require("express");
const { getUserProfile } = require("../controllers/userController");
const auth = require("../middleware/auth");

const router = express.Router();

// Get a user's public profile (Protected route so only logged-in users can view profiles)
router.get("/:username/profile", auth, getUserProfile);

module.exports = router;
