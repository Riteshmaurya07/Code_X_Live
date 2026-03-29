const crypto = require("crypto");
const Project = require("../models/Project");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const logger = require("../utils/logger");

// Invite collaborator by email or username
const inviteCollaborator = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { emailOrUsername, role } = req.body;

    if (!emailOrUsername) {
      return res.status(400).json({ success: false, message: "Email or username is required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Only owner can invite
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only project owner can invite" });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername },
        { username: emailOrUsername },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot invite yourself" });
    }

    // Check if already a collaborator
    const exists = project.collaborators.find(
      (c) => c.user && c.user.toString() === user._id.toString()
    );
    if (exists) {
      return res.status(400).json({ success: false, message: "User is already a collaborator" });
    }

    project.collaborators.push({
      user: user._id,
      role: role || "editor",
    });
    await project.save();

    await ActivityLog.create({
      project: projectId,
      user: req.user._id,
      username: req.user.username,
      action: "collaborator_invited",
      details: `Invited ${user.username} as ${role || "editor"}`,
    });

    logger.info(`Collaborator ${user.username} invited to project ${project.name}`);
    res.json({ success: true, message: `${user.username} invited as ${role || "editor"}` });
  } catch (err) {
    next(err);
  }
};

// Remove collaborator
const removeCollaborator = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only owner can remove collaborators" });
    }

    project.collaborators = project.collaborators.filter(
      (c) => !c.user || c.user.toString() !== userId
    );
    await project.save();

    await ActivityLog.create({
      project: projectId,
      user: req.user._id,
      username: req.user.username,
      action: "collaborator_removed",
      details: `Removed collaborator ${userId}`,
    });

    res.json({ success: true, message: "Collaborator removed" });
  } catch (err) {
    next(err);
  }
};

// Generate shareable link
const generateShareLink = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only owner can generate share links" });
    }

    // Generate a unique token
    const token = crypto.randomBytes(24).toString("hex");
    project.shareToken = token;
    await project.save();

    const shareUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/join/${token}`;

    logger.info(`Share link generated for project ${project.name}`);
    res.json({ success: true, shareUrl, token });
  } catch (err) {
    next(err);
  }
};

// Join via share link
const joinViaShareLink = async (req, res, next) => {
  try {
    const { token } = req.params;

    const project = await Project.findOne({ shareToken: token });
    if (!project) {
      return res.status(404).json({ success: false, message: "Invalid share link" });
    }

    const userId = req.user._id.toString();

    // Already owner
    if (project.owner.toString() === userId) {
      return res.json({ success: true, projectId: project._id, message: "You own this project" });
    }

    // Already a collaborator
    const exists = project.collaborators.find(
      (c) => c.user && c.user.toString() === userId
    );
    if (exists) {
      return res.json({ success: true, projectId: project._id, message: "Already a collaborator" });
    }

    project.collaborators.push({
      user: req.user._id,
      role: "editor",
    });
    await project.save();

    logger.info(`User ${req.user.username} joined project ${project.name} via share link`);
    res.json({ success: true, projectId: project._id, message: "Joined as editor" });
  } catch (err) {
    next(err);
  }
};

// Get collaborators for a project
const getCollaborators = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("collaborators.user", "username email")
      .populate("owner", "username email");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({
      owner: project.owner,
      collaborators: project.collaborators,
      shareToken: project.shareToken,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  inviteCollaborator,
  removeCollaborator,
  generateShareLink,
  joinViaShareLink,
  getCollaborators,
};
