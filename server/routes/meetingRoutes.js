const express = require("express");
const router = express.Router();
const {
  createMeeting,
  getProjectMeetings,
  updateMeetingStatus,
  deleteMeeting,
} = require("../controllers/meetingController");
const auth = require("../middleware/auth");

router.use(auth); // Protect all meeting routes

router.post("/", createMeeting);
router.get("/project/:projectId", getProjectMeetings);
router.patch("/:id/status", updateMeetingStatus);
router.delete("/:id", deleteMeeting);

module.exports = router;
