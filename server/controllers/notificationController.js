const Notification = require("../models/Notification");
const { getSocketIdByUserId } = require("../sockets/socketHandler");
const logger = require("../utils/logger");

// Helper to push real-time notification
const pushRealTimeNotification = (req, recipientId, notification) => {
  if (req.app) {
    const io = req.app.get("io");
    if (io) {
      const socketId = getSocketIdByUserId(recipientId);
      if (socketId) {
        io.to(socketId).emit("NEW_NOTIFICATION", notification);
      }
    }
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.find({ recipient: userId })
      .populate("relatedUser", "username avatar")
      .populate("relatedProject", "name")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(notifications);
  } catch (error) {
    logger.error("Error fetching notifications", error);
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    
    res.json(notification);
  } catch (error) {
    logger.error("Error marking notification read", error);
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    logger.error("Error marking all notifications read", error);
    next(error);
  }
};

exports.createNotification = async (req, { recipient, type, message, relatedUser, relatedProject, actionUrl }) => {
  try {
    // Prevent duplicate unread notifications for the exact same event
    const exists = await Notification.findOne({
      recipient, type, relatedUser, relatedProject, read: false
    });
    if (exists) return exists;

    const notification = await Notification.create({
      recipient,
      type,
      message,
      relatedUser,
      relatedProject,
      actionUrl
    });

    const populated = await Notification.findById(notification._id)
      .populate("relatedUser", "username avatar")
      .populate("relatedProject", "name");

    pushRealTimeNotification(req, recipient, populated);
    return populated;
  } catch (err) {
    logger.error("Error creating notification", err);
  }
};
