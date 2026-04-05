const express = require("express");
const router = express.Router();
const {
  inviteCollaborator,
  removeCollaborator,
  generateShareLink,
  joinViaShareLink,
  getCollaborators,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  getProjectInvitations,
} = require("../controllers/sharingController");
const auth = require("../middleware/auth");

router.use(auth);

// ── Invitation management ──
router.get("/invitations/my", getMyInvitations);                     // Get my pending invitations
router.post("/invitations/:invitationId/accept", acceptInvitation);  // Accept an invitation
router.post("/invitations/:invitationId/decline", declineInvitation); // Decline an invitation

// ── Project collaboration ──
router.post("/:projectId/invite", inviteCollaborator);
router.delete("/:projectId/collaborator/:userId", removeCollaborator);
router.post("/:projectId/share-link", generateShareLink);
router.post("/join/:token", joinViaShareLink);
router.get("/:projectId/collaborators", getCollaborators);
router.get("/:projectId/invitations", getProjectInvitations);        // Get pending invitations for project

module.exports = router;
