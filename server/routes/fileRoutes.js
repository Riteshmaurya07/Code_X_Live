const express = require("express");
const router = express.Router();
const {
  createFile,
  getFile,
  updateFile,
  autosaveFile,
  getFileVersions,
  restoreVersion,
  deleteFile,
} = require("../controllers/fileController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const resolveFile = require("../middleware/resolveFile");
const resolveVersion = require("../middleware/resolveVersion");

router.use(auth);

// Autosave: fileId is in req.body
router.post("/autosave", resolveFile, checkPermission("owner", "editor"), autosaveFile);

// Create file: projectId is in req.params
router.post("/:projectId", checkPermission("owner", "editor"), createFile);

// Get file versions: fileId is in req.params.id
router.get("/:id/versions", resolveFile, checkPermission("owner", "editor", "viewer"), getFileVersions);

// Restore version
router.post("/versions/:versionId/restore", resolveVersion, checkPermission("owner", "editor"), restoreVersion);

// For the rest, the param is :id which is fileId
router.get("/:id", resolveFile, checkPermission("owner", "editor", "viewer"), getFile);
router.put("/:id", resolveFile, checkPermission("owner", "editor"), updateFile);
router.delete("/:id", resolveFile, checkPermission("owner", "editor"), deleteFile);

module.exports = router;
