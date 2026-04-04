const User = require("../models/User");
const Project = require("../models/Project");

// Get a public user profile and their public projects
const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    // Find the user by username to get their ID and profile details
    const user = await User.findOne({ username }).select("-password");

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
        email: user.email,
        createdAt: user.createdAt,
      },
      publicProjects: projects,
    });
  } catch (err) {
    console.error("Get user profile error:", err.message);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

module.exports = {
  getUserProfile,
};
