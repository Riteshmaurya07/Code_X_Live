const express = require("express");
const router = express.Router();
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");
const { downloadProject } = require("../controllers/downloadController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");

router.use(auth); // All project routes are protected

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:id/download", checkPermission("owner", "editor", "viewer"), downloadProject);
router.get("/:id", checkPermission("owner", "editor", "viewer"), getProject);
router.put("/:id", checkPermission("owner"), updateProject);
router.delete("/:id", checkPermission("owner"), deleteProject);

module.exports = router;
