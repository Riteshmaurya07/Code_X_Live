const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");
const Project = require("../models/Project");

// Get activity log for a project
const getProjectActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find({ project: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username"),
      ActivityLog.countDocuments({ project: id }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Utility: log an activity (used internally by other controllers)
const logActivity = async (projectId, userId, username, action, details) => {
  try {
    await ActivityLog.create({
      project: projectId || undefined,
      user: userId || null,
      username: username || "System",
      action,
      details,
    });
  } catch (err) {
    // Silently fail — activity logging should never block operations
    console.error("Activity log error:", err.message);
  }
};

// Get rich activity dashboard for a user profile
const getUserActivityDashboard = async (req, res, next) => {
  try {
    const { username } = req.params;
    
    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);

    // 1. Fetch Heatmap base data (365 days)
    const logs = await ActivityLog.find({ 
      user: targetUser._id,
      createdAt: { $gte: oneYearAgo }
    }).sort({ createdAt: -1 }); // Get all for counts and recent array

    // Calculate Heatmap & Streaks
    const heatmapCounts = {};
    let currentStreak = 0;
    let maxStreak = 0;
    
    // Normalize date strings (YYYY-MM-DD) natively
    logs.forEach(log => {
      const dateStr = log.createdAt.toISOString().split("T")[0];
      heatmapCounts[dateStr] = (heatmapCounts[dateStr] || 0) + 1;
    });

    // Calculate Current Streak (looking back from today)
    const today = new Date();
    let checkDate = new Date(today);
    
    // Timezone safe streak checking
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (heatmapCounts[dateStr]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Allow missing TODAY only without breaking the streak
        if (currentStreak === 0 && checkDate.toDateString() === today.toDateString()) {
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // 2. Fetch Recent Feed (top 15)
    const recentActivity = logs.slice(0, 15).map(log => ({
      _id: log._id,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt,
      project: log.project
    }));

    // 3. Collaboration Metrics
    // Fast path: find projects where this user is a collaborator or owner
    const collabProjects = await Project.countDocuments({
      $or: [
        { owner: targetUser._id },
        { "collaborators.user": targetUser._id }
      ]
    });

    // Sub-metric: Projects they don't own but joined
    const joinedProjects = await Project.countDocuments({
      "collaborators.user": targetUser._id,
      owner: { $ne: targetUser._id }
    });

    // Count this month's active days
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const activeDaysThisMonth = Object.keys(heatmapCounts).filter(dateStr => {
      const d = new Date(dateStr);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    res.json({
      stats: {
        currentStreak,
        activeDaysThisMonth,
        totalProjects: collabProjects,
        joinedCollaborations: joinedProjects
      },
      heatmap: heatmapCounts,
      recentActivity
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProjectActivity, logActivity, getUserActivityDashboard };
