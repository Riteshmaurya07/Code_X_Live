const express = require("express");
const { getUserProfile, followUser, unfollowUser, searchUsers, getFollowers, getFollowing } = require("../controllers/userController");
const { getUserActivityDashboard } = require("../controllers/activityController");
const auth = require("../middleware/auth");

const router = express.Router();

// Get a user's public profile (Protected route so only logged-in users can view profiles)
router.get("/:username/profile", auth, getUserProfile);

// Follow / Unfollow
router.post("/:id/follow", auth, followUser);
router.post("/:id/unfollow", auth, unfollowUser);

// Search users (for invitations)
router.get("/search", auth, searchUsers);

// Followers / Following Lists
router.get("/:username/followers", auth, getFollowers);
router.get("/:username/following", auth, getFollowing);

// Activity Dashboard
router.get("/:username/activity-dashboard", auth, getUserActivityDashboard);

module.exports = router;
