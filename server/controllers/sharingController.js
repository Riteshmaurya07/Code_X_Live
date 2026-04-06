const crypto = require("crypto");
const Project = require("../models/Project");
const User = require("../models/User");
const Invitation = require("../models/Invitation");
const ActivityLog = require("../models/ActivityLog");
const logger = require("../utils/logger");
const { sendMail } = require("../config/mailer");
const { invitationEmail, acceptedEmail, declinedEmail } = require("../utils/emailTemplates");
const { createNotification } = require("./notificationController");

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// ─────────────────────────────────────────────────────
// Invite collaborator by email or username (now creates a PENDING invitation)
// ─────────────────────────────────────────────────────
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
    const isCollaborator = project.collaborators.find(
      (c) => c.user && c.user.toString() === user._id.toString()
    );
    if (isCollaborator) {
      return res.status(400).json({ success: false, message: "User is already a collaborator" });
    }

    // Check if an invitation already exists (pending)
    const existingInvitation = await Invitation.findOne({
      project: projectId,
      invitedUser: user._id,
      status: "pending",
    });
    if (existingInvitation) {
      return res.status(400).json({ success: false, message: "Invitation already sent to this user" });
    }

    // Create the invitation
    const invitation = await Invitation.create({
      project: projectId,
      invitedBy: req.user._id,
      invitedUser: user._id,
      role: role || "editor",
    });

    // Send email notification
    let emailSent = false;
    try {
      const dashboardUrl = `${CLIENT_URL}/dashboard`;
      const html = invitationEmail(
        req.user.username,
        project.name,
        role || "editor",
        `${CLIENT_URL}/invitation/${invitation.token}`,
        dashboardUrl
      );
      await sendMail(user.email, `You've been invited to collaborate on "${project.name}"`, html);
      invitation.emailSent = true;
      await invitation.save();
      emailSent = true;
    } catch (emailErr) {
      logger.warn(`Email notification failed for invitation: ${emailErr.message}`);
      // Don't fail the invitation if email fails
    }

    // In-app Notification
    try {
      await createNotification(req, {
        recipient: user._id,
        type: "invitation",
        message: `${req.user.username} invited you to collaborate on "${project.name}" as ${role || "editor"}`,
        relatedUser: req.user._id,
        relatedProject: projectId,
        actionUrl: `/dashboard`,
      });
    } catch (notifErr) {
      logger.warn(`In-app notification dispatch failed: ${notifErr.message}`);
    }

    // Log activity
    await ActivityLog.create({
      project: projectId,
      user: req.user._id,
      username: req.user.username,
      action: "collaborator_invited",
      details: `Invited ${user.username} as ${role || "editor"}`,
    });

    logger.info(`Invitation sent to ${user.username} for project ${project.name}`);
    res.json({
      success: true,
      message: `Invitation sent to ${user.username}${emailSent ? " (email notification sent)" : ""}`,
      invitation: {
        _id: invitation._id,
        status: invitation.status,
        emailSent,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────
// Get my pending invitations (for dashboard display)
// ─────────────────────────────────────────────────────
const getMyInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.find({
      invitedUser: req.user._id,
      status: "pending",
      expiresAt: { $gt: new Date() }, // Not expired
    })
      .populate("project", "name language")
      .populate("invitedBy", "username email avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, invitations });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────
// Accept an invitation
// ─────────────────────────────────────────────────────
const acceptInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;

    const invitation = await Invitation.findById(invitationId)
      .populate("project", "name owner roomId")
      .populate("invitedBy", "username email");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }

    // Verify this invitation belongs to the current user
    if (invitation.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "This invitation is not for you" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: `Invitation already ${invitation.status}` });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invitation has expired" });
    }

    // Add user to project collaborators
    const project = await Project.findById(invitation.project._id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project no longer exists" });
    }

    // Double-check not already a collaborator
    const alreadyCollab = project.collaborators.find(
      (c) => c.user && c.user.toString() === req.user._id.toString()
    );
    if (!alreadyCollab) {
      project.collaborators.push({
        user: req.user._id,
        role: invitation.role,
      });
      await project.save();
    }

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    // Send acceptance notification email to project owner
    try {
      const owner = await User.findById(project.owner).select("email username");
      if (owner) {
        const projectUrl = `${CLIENT_URL}/editor/${project.roomId || project._id}`;
        const html = acceptedEmail(req.user.username, invitation.project.name, projectUrl);
        await sendMail(owner.email, `${req.user.username} accepted your invitation for "${invitation.project.name}"`, html);

        // In-app Notification to the owner
        await createNotification(req, {
          recipient: project.owner,
          type: "system",
          message: `${req.user.username} accepted your invitation to collaborate on "${project.name}"`,
          relatedUser: req.user._id,
          relatedProject: project._id,
          actionUrl: `/editor/${project.roomId || project._id}`,
        });
      }
    } catch (err) {
      logger.warn(`Acceptance notification failed: ${err.message}`);
    }

    // Log activity
    await ActivityLog.create({
      project: invitation.project._id,
      user: req.user._id,
      username: req.user.username,
      action: "invitation_accepted",
      details: `${req.user.username} accepted invitation as ${invitation.role}`,
    });

    logger.info(`${req.user.username} accepted invitation for project ${invitation.project.name}`);
    res.json({
      success: true,
      message: `You are now a ${invitation.role} on "${invitation.project.name}"`,
      projectId: invitation.project._id,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────
// Decline an invitation
// ─────────────────────────────────────────────────────
const declineInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;

    const invitation = await Invitation.findById(invitationId)
      .populate("project", "name owner")
      .populate("invitedBy", "username email");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found" });
    }

    if (invitation.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "This invitation is not for you" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: `Invitation already ${invitation.status}` });
    }

    invitation.status = "declined";
    await invitation.save();

    // Optionally notify the owner
    try {
      const owner = await User.findById(invitation.project.owner).select("email username");
      if (owner) {
        const html = declinedEmail(req.user.username, invitation.project.name);
        await sendMail(owner.email, `${req.user.username} declined your invitation for "${invitation.project.name}"`, html);

        // In-app Notification to the owner
        await createNotification(req, {
          recipient: invitation.project.owner,
          type: "system",
          message: `${req.user.username} declined your invitation for "${invitation.project.name}"`,
          relatedUser: req.user._id,
          relatedProject: invitation.project._id,
          actionUrl: `/dashboard`,
        });
      }
    } catch (err) {
      logger.warn(`Decline notification failed: ${err.message}`);
    }

    logger.info(`${req.user.username} declined invitation for project ${invitation.project.name}`);
    res.json({ success: true, message: "Invitation declined" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────
// Get pending invitations sent for a specific project (for ShareModal)
// ─────────────────────────────────────────────────────
const getProjectInvitations = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const invitations = await Invitation.find({
      project: projectId,
      status: "pending",
    })
      .populate("invitedUser", "username email")
      .sort({ createdAt: -1 });

    res.json({ success: true, invitations });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────
// Remove collaborator (unchanged)
// ─────────────────────────────────────────────────────
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

    // Also clean up any invitations for this user
    await Invitation.deleteMany({ project: projectId, invitedUser: userId });

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

// ─────────────────────────────────────────────────────
// Generate shareable link (unchanged)
// ─────────────────────────────────────────────────────
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

    const token = crypto.randomBytes(24).toString("hex");
    project.shareToken = token;
    await project.save();

    const shareUrl = `${CLIENT_URL}/join/${token}`;

    logger.info(`Share link generated for project ${project.name}`);
    res.json({ success: true, shareUrl, token });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────
// Join via share link (unchanged)
// ─────────────────────────────────────────────────────
const joinViaShareLink = async (req, res, next) => {
  try {
    const { token } = req.params;

    const project = await Project.findOne({ shareToken: token });
    if (!project) {
      return res.status(404).json({ success: false, message: "Invalid share link" });
    }

    const userId = req.user._id.toString();

    if (project.owner.toString() === userId) {
      return res.json({ success: true, projectId: project._id, message: "You own this project" });
    }

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

// ─────────────────────────────────────────────────────
// Get collaborators for a project (unchanged)
// ─────────────────────────────────────────────────────
const getCollaborators = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("collaborators.user", "username email")
      .populate("owner", "username email");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Also get pending invitations for this project
    const pendingInvitations = await Invitation.find({
      project: req.params.projectId,
      status: "pending",
    }).populate("invitedUser", "username email");

    res.json({
      owner: project.owner,
      collaborators: project.collaborators,
      shareToken: project.shareToken,
      pendingInvitations,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  inviteCollaborator,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  getProjectInvitations,
  removeCollaborator,
  generateShareLink,
  joinViaShareLink,
  getCollaborators,
};
