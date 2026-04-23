const User = require("../models/User");
const Follow = require("../models/Follow");
const Project = require("../models/Project");
const { createNotification } = require("./notificationController");
const { logActivity } = require("./activityController");
const logger = require("../utils/logger");
const { cloudinary } = require("../config/cloudinary");

// Get a public user profile and their public projects
const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    // Find the user by username to get their ID and profile details
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [followersCount, followingCount, isFollowing] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      req.user ? Follow.exists({ follower: req.user._id, following: user._id }) : false,
    ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only return projects that are explicitly marked as public
    const projects = await Project.find({
      owner: user._id,
      isPublic: true,
    })
      .sort({ updatedAt: -1 })
      .populate("owner", "username")
      .populate("collaborators.user", "username");

    res.json({
      profile: {
        id: user._id,
        username: user.username,
        fullName: user.fullName || "",
        email: user.email,
        avatar: user.avatar || "",
        createdAt: user.createdAt,
        followersCount,
        followingCount,
        isFollowing: !!isFollowing,
      },
      publicProjects: projects,
    });
  } catch (err) {
    logger.error(`Get user profile error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    const existingFollow = await Follow.findOne({ follower: currentUserId, following: targetUserId });

    if (!existingFollow) {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) return res.status(404).json({ error: "User not found" });

      await Follow.create({ follower: currentUserId, following: targetUserId });
      
      // Notify target user
      await createNotification(req, {
        recipient: targetUserId,
        type: "follow",
        message: `${req.user.username} started following you`,
        relatedUser: currentUserId,
        actionUrl: `/profile/${req.user.username}`,
      });

      // Log global activity for the heatmap
      await logActivity(
        null,
        currentUserId,
        req.user.username,
        "user_followed",
        `Followed user ${targetUser.username}`
      );
    }

    res.json({ success: true, message: "User followed successfully" });
  } catch (err) {
    logger.error(`Follow error: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    await Follow.findOneAndDelete({ follower: currentUserId, following: targetUserId });

    res.json({ success: true, message: "User unfollowed successfully" });
  } catch (err) {
    logger.error(`Unfollow error: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    // Secure simple search ignoring current user
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { 
          $or: [
            { username: { $regex: query, $options: "i" } },
            { email: { $regex: "^" + query, $options: "i" } }
          ]
        }
      ]
    })
    .select("username email avatar fullName")
    .limit(10);

    res.json(users);
  } catch (err) {
    logger.error(`Search error: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFollowers = async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const followers = await Follow.find({ following: user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("follower", "username fullName avatar");

    const followersData = await Promise.all(followers.map(async (f) => {
      const isMutual = await Follow.exists({ follower: user._id, following: f.follower._id });
      const isFollowing = await Follow.exists({ follower: req.user._id, following: f.follower._id });
      return {
        _id: f.follower._id,
        username: f.follower.username,
        fullName: f.follower.fullName,
        avatar: f.follower.avatar,
        isMutual: !!isMutual,
        isFollowing: !!isFollowing,
      };
    }));

    res.json(followersData);
  } catch (err) {
    logger.error(`Get followers error: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFollowing = async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const following = await Follow.find({ follower: user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("following", "username fullName avatar");

    const followingData = await Promise.all(following.map(async (f) => {
      const isMutual = await Follow.exists({ follower: f.following._id, following: user._id });
      const isFollowing = await Follow.exists({ follower: req.user._id, following: f.following._id });
      return {
        _id: f.following._id,
        username: f.following.username,
        fullName: f.following.fullName,
        avatar: f.following.avatar,
        isMutual: !!isMutual,
        isFollowing: !!isFollowing,
      };
    }));

    res.json(followingData);
  } catch (err) {
    logger.error(`Get following error: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update avatar via Cloudinary (file uploaded by multer middleware)
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Delete old Cloudinary avatar if it exists
    if (user.avatar && user.avatar.includes("cloudinary.com")) {
      try {
        // Extract public_id from URL: .../codexlive/avatars/<public_id>.ext
        const parts = user.avatar.split("/");
        const fileWithExt = parts[parts.length - 1];
        const publicId = `codexlive/avatars/${fileWithExt.split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (delErr) {
        logger.warn(`Could not delete old avatar: ${delErr.message}`);
      }
    }

    // req.file.path is the Cloudinary URL from multer-storage-cloudinary
    user.avatar = req.file.path;
    await user.save();

    logger.info(`Avatar updated for user ${user.username}`);
    res.json({ success: true, avatar: user.avatar });
  } catch (err) {
    logger.error(`Update avatar error: ${err.message}`);
    res.status(500).json({ error: "Failed to update avatar" });
  }
};

// Update profile fields (fullName)
const updateProfile = async (req, res) => {
  try {
    const { fullName } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (fullName !== undefined) user.fullName = fullName.trim();
    await user.save();

    res.json({ success: true, fullName: user.fullName });
  } catch (err) {
    logger.error(`Update profile error: ${err.message}`);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

module.exports = {
  getUserProfile,
  followUser,
  unfollowUser,
  searchUsers,
  getFollowers,
  getFollowing,
  updateAvatar,
  updateProfile,
};
