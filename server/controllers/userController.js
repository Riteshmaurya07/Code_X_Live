const User = require("../models/User");
const Project = require("../models/Project");
const { createNotification } = require("./notificationController");
const { logActivity } = require("./activityController");

// Get a public user profile and their public projects
const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    // Find the user by username to get their ID and profile details
    // Find the user by username to get their ID and profile details
    const user = await User.findOne({ username })
      .select("-password")
      .populate("followers", "username avatar")
      .populate("following", "username avatar");

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
        createdAt: user.createdAt,
        followers: user.followers,
        following: user.following,
      },
      publicProjects: projects,
    });
  } catch (err) {
    console.error("Get user profile error:", err.message);
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

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // Ensure no duplicates
    if (!targetUser.followers.includes(currentUserId)) {
      targetUser.followers.push(currentUserId);
      await targetUser.save();
    }
    
    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
      await currentUser.save();
      
      // Notify target user
      await createNotification(req, {
        recipient: targetUserId,
        type: "follow",
        message: `${currentUser.username} started following you`,
        relatedUser: currentUserId,
        actionUrl: `/profile/${currentUser.username}`,
      });

      // Log global activity for the heatmap
      await logActivity(
        null,
        currentUserId,
        currentUser.username,
        "user_followed",
        `Followed user ${targetUser.username}`
      );
    }

    res.json({ success: true, message: "User followed successfully" });
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) return res.status(404).json({ error: "User not found" });

    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId.toString());
    await targetUser.save();

    currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId.toString());
    await currentUser.save();

    res.json({ success: true, message: "User unfollowed successfully" });
  } catch (err) {
    console.error("Unfollow error:", err);
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
    console.error("Search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFollowers = async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const targetUser = await User.findOne({ username })
      .populate({
        path: "followers",
        select: "username fullName avatar",
        options: { skip: (page - 1) * limit, limit }
      });

    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const currentUser = await User.findById(req.user._id);

    const followersData = targetUser.followers.map(f => ({
      _id: f._id,
      username: f.username,
      fullName: f.fullName,
      avatar: f.avatar,
      isMutual: currentUser.following.includes(f._id),
      isFollowing: currentUser.following.includes(f._id),
    }));

    res.json(followersData);
  } catch (err) {
    console.error("Get followers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFollowing = async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const targetUser = await User.findOne({ username })
      .populate({
        path: "following",
        select: "username fullName avatar",
        options: { skip: (page - 1) * limit, limit }
      });

    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const currentUser = await User.findById(req.user._id);

    const followingData = targetUser.following.map(f => ({
      _id: f._id,
      username: f.username,
      fullName: f.fullName,
      avatar: f.avatar,
      isMutual: currentUser.followers.includes(f._id),
      isFollowing: currentUser.following.includes(f._id),
    }));

    res.json(followingData);
  } catch (err) {
    console.error("Get following error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getUserProfile,
  followUser,
  unfollowUser,
  searchUsers,
  getFollowers,
  getFollowing
};
