const express = require("express");
const router = express.Router();
const {
  inviteCollaborator,
  removeCollaborator,
  generateShareLink,
  joinViaShareLink,
  getCollaborators,
} = require("../controllers/sharingController");
const auth = require("../middleware/auth");

router.use(auth);

router.post("/:projectId/invite", inviteCollaborator);
router.delete("/:projectId/collaborator/:userId", removeCollaborator);
router.post("/:projectId/share-link", generateShareLink);
router.post("/join/:token", joinViaShareLink);
router.get("/:projectId/collaborators", getCollaborators);

module.exports = router;
