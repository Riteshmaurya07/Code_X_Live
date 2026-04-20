const Meeting = require("../models/Meeting");
const Project = require("../models/Project");
const User = require("../models/User");
const { sendMail } = require("../config/mailer");
const { meetingInviteTemplate } = require("../utils/emailTemplates");
const ACTIONS = require("../Actions");
const logger = require("../utils/logger");

const normalizeParticipantIds = (ids = [], fallbackUserId) => {
  const allIds = [...(Array.isArray(ids) ? ids : []), fallbackUserId]
    .filter(Boolean)
    .map((id) => id.toString());
  return [...new Set(allIds)];
};

const verifyMeetingProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { project: null, allowed: false, reason: "Project not found" };
  const isCollab = project.collaborators.some(
    (c) => c.user && c.user.toString() === userId
  );
  const allowed = project.owner.toString() === userId || isCollab;
  return { project, allowed, reason: allowed ? null : "Not authorized" };
};

const populateMeeting = (meetingId) =>
  Meeting.findById(meetingId)
    .populate("createdBy", "username email avatar")
    .populate("participants", "username email avatar");

const emitMeetingEvent = (req, projectId, event, payload) => {
  const io = req.app.get("io");
  if (io) {
    io.to(projectId.toString()).emit(event, payload);
  }
};

exports.createMeeting = async (req, res, next) => {
  try {
    const { title, description, projectId, participants, startTime, duration } = req.body;
    const userId = req.user.id;

    const { project, allowed, reason } = await verifyMeetingProjectAccess(projectId, userId);
    if (!project) return res.status(404).json({ message: reason });
    if (!allowed) {
      return res.status(403).json({ message: "Not authorized to create meetings" });
    }

    const start = new Date(startTime);
    const safeDuration = Number(duration) || 30;
    const end = new Date(start.getTime() + safeDuration * 60000);
    const participantIds = normalizeParticipantIds(participants, userId);

    const meeting = new Meeting({
      title,
      description,
      projectId,
      createdBy: userId,
      participants: participantIds,
      startTime: start,
      endTime: end,
      duration: safeDuration,
      status: "scheduled",
    });

    await meeting.save();

    meeting.meetingLink = meeting.meetingLink || `https://meet.jit.si/CodeXLive-${meeting._id}`;
    await meeting.save();

    const populatedMeeting = await populateMeeting(meeting._id);

    const creator = await User.findById(userId);

    if (participantIds.length > 0) {
      const invitees = await User.find({ _id: { $in: participantIds, $ne: userId } });
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

    emitMeetingEvent(req, projectId, ACTIONS.MEETING_CREATED, { meeting: populatedMeeting });

    res.status(201).json(populatedMeeting);
  } catch (error) {
    next(error);
  }
};

exports.getProjectMeetings = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { project, allowed } = await verifyMeetingProjectAccess(projectId, userId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!allowed) {
      return res.status(403).json({ message: "Not authorized to view meetings" });
    }

    const meetings = await Meeting.find({ projectId })
      .populate("createdBy", "username email avatar")
      .populate("participants", "username email avatar")
      .sort({ startTime: 1 });
      
    res.json(meetings);
  } catch (error) {
    next(error);
  }
};

exports.getMeetingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id)
      .populate("createdBy", "username email avatar")
      .populate("participants", "username email avatar");
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const userId = req.user.id;
    const { project, allowed } = await verifyMeetingProjectAccess(meeting.projectId, userId);
    if (!project) return res.status(404).json({ message: "Project not found" });
    if (!allowed) return res.status(403).json({ message: "Not authorized to view this meeting" });

    res.json(meeting);
  } catch (error) {
    next(error);
  }
};

exports.updateMeeting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, startTime, duration, participants } = req.body;
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only creator can edit meeting" });
    }

    if (title !== undefined) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (duration !== undefined) meeting.duration = Number(duration) || meeting.duration;
    if (startTime !== undefined) {
      const start = new Date(startTime);
      meeting.startTime = start;
      meeting.endTime = new Date(start.getTime() + meeting.duration * 60000);
    } else if (duration !== undefined) {
      meeting.endTime = new Date(new Date(meeting.startTime).getTime() + meeting.duration * 60000);
    }
    if (participants !== undefined) {
      meeting.participants = normalizeParticipantIds(participants, meeting.createdBy);
    }
    if (!meeting.meetingLink) {
      meeting.meetingLink = `https://meet.jit.si/CodeXLive-${meeting._id}`;
    }

    await meeting.save();
    const populatedMeeting = await populateMeeting(id);
    emitMeetingEvent(req, meeting.projectId, ACTIONS.MEETING_UPDATED, { meeting: populatedMeeting });
    res.json(populatedMeeting);
  } catch (error) {
    next(error);
  }
};

exports.inviteParticipants = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { participants } = req.body;
    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only creator can invite participants" });
    }

    const merged = normalizeParticipantIds(
      [...meeting.participants.map((p) => p.toString()), ...(participants || [])],
      meeting.createdBy
    );
    meeting.participants = merged;
    await meeting.save();

    const populatedMeeting = await populateMeeting(id);
    emitMeetingEvent(req, meeting.projectId, ACTIONS.MEETING_UPDATED, { meeting: populatedMeeting });
    res.json(populatedMeeting);
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

    emitMeetingEvent(req, meeting.projectId, ACTIONS.MEETING_UPDATED, { meeting: populatedMeeting });

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

    emitMeetingEvent(req, projectId, ACTIONS.MEETING_DELETED, { meetingId: id });

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    next(error);
  }
};
