const ActivityLog = require("../models/ActivityLog");

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
      project: projectId,
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

module.exports = { getProjectActivity, logActivity };
