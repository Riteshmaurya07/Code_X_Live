const express = require("express");
const router = express.Router();
const {
  createMeeting,
  getProjectMeetings,
  getMeetingById,
  updateMeeting,
  inviteParticipants,
  updateMeetingStatus,
  deleteMeeting,
} = require("../controllers/meetingController");
const auth = require("../middleware/auth");

router.use(auth); // Protect all meeting routes

router.post("/", createMeeting);
router.get("/project/:projectId", getProjectMeetings);
router.get("/:id", getMeetingById);
router.put("/:id", updateMeeting);
router.patch("/:id/invite", inviteParticipants);
router.patch("/:id/status", updateMeetingStatus);
router.delete("/:id", deleteMeeting);

module.exports = router;
