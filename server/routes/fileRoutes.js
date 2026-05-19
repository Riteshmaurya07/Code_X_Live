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

router.use(auth);

router.post("/autosave", autosaveFile);
router.post("/:projectId", createFile);
router.get("/:id", getFile);
router.get("/:id/versions", getFileVersions);
router.post("/versions/:versionId/restore", restoreVersion);
router.put("/:id", updateFile);
router.delete("/:id", deleteFile);

module.exports = router;
