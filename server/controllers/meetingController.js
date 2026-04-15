const mongoose = require("mongoose");
const Meeting = require("../models/Meeting");
const Project = require("../models/Project");
const User = require("../models/User");
const { sendMail } = require("../config/mailer");
const { meetingInviteTemplate } = require("../utils/emailTemplates");
const ACTIONS = require("../Actions");
const logger = require("../utils/logger");

exports.createMeeting = async (req, res, next) => {
  try {
    const { title, description, projectId, participants, startTime, duration } = req.body;
    const userId = req.user.id; // set by auth middleware

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Ensure user is authorized to create meeting (owner or collaborator)
    const isCollab = project.collaborators.some(
      (c) => c.user && c.user.toString() === userId
    );
    if (project.owner.toString() !== userId && !isCollab) {
      return res.status(403).json({ message: "Not authorized to create meetings" });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    const meeting = new Meeting({
      title,
      description,
      projectId,
      createdBy: userId,
      participants,
      startTime: start,
      endTime: end,
      duration,
      status: "scheduled",
    });

    await meeting.save();

    // Generate link
    meeting.meetingLink = `https://meet.jit.si/CodeXLive-${meeting._id}`;
    await meeting.save();

    const populatedMeeting = await Meeting.findById(meeting._id).populate("createdBy", "username email avatar").populate("participants", "username email avatar");

    // Fetch meeting creator user
    const creator = await User.findById(userId);

    // Filter participants who actually want invites and exist
    if (participants && participants.length > 0) {
      const invitees = await User.find({ _id: { $in: participants } });
      const startTimeStr = start.toLocaleString();
      
      for (const invitee of invitees) {
        try {
          const html = meetingInviteTemplate(
            creator.username,
            project.name,
            title,
            startTimeStr,
            meeting.meetingLink
          );
          await sendMail(invitee.email, `Meeting Invitation: ${title}`, html);
        } catch (e) {
          logger.error(`Could not send meeting invite to ${invitee.email}:`, e);
        }
      }
    }

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.to(projectId.toString()).emit(ACTIONS.MEETING_CREATED, { meeting: populatedMeeting });
    }

    res.status(201).json(populatedMeeting);
  } catch (error) {
    next(error);
  }
};

exports.getProjectMeetings = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Authorization check
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const userId = req.user.id;
    const isCollab = project.collaborators.some(
      (c) => c.user && c.user.toString() === userId
    );
    if (project.owner.toString() !== userId && !isCollab) {
      return res.status(403).json({ message: "Not authorized to view meetings" });
    }

    // Return meetings sorted by start time
    const meetings = await Meeting.find({ projectId })
      .populate("createdBy", "username email avatar")
      .populate("participants", "username email avatar")
      .sort({ startTime: 1 });
      
    res.json(meetings);
  } catch (error) {
    next(error);
  }
};

exports.updateMeetingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    // basic verification - only participants or owner can update
    const userId = req.user.id;
    const isParticipant = meeting.participants.includes(userId);
    if (meeting.createdBy.toString() !== userId && !isParticipant) {
      return res.status(403).json({ message: "Not authorized" });
    }

    meeting.status = status;
    await meeting.save();

    const populatedMeeting = await Meeting.findById(id).populate("createdBy", "username email avatar").populate("participants", "username email avatar");

    const io = req.app.get("io");
    if (io) {
      io.to(meeting.projectId.toString()).emit(ACTIONS.MEETING_UPDATED, { meeting: populatedMeeting });
    }

    res.json(populatedMeeting);
  } catch (error) {
    next(error);
  }
};

exports.deleteMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only creator can delete meeting" });
    }

    const projectId = meeting.projectId;
    await Meeting.findByIdAndDelete(id);

    const io = req.app.get("io");
    if (io) {
      io.to(projectId.toString()).emit(ACTIONS.MEETING_DELETED, { meetingId: id });
    }

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    next(error);
  }
};
