const Version = require("../models/Version");
const File = require("../models/File");
const Project = require("../models/Project");

/**
 * Middleware to resolve a version and its associated file and project.
 * Looks for versionId in req.params.versionId
 */
const resolveVersion = async (req, res, next) => {
  try {
    const versionId = req.params.versionId;
    if (!versionId) {
      return res.status(400).json({ success: false, message: "Version ID required" });
    }

    if (typeof versionId !== "string" || !versionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid version ID format" });
    }

    const version = await Version.findById(versionId);
    if (!version) {
      return res.status(404).json({ success: false, message: "Version not found" });
    }

    const file = await File.findById(version.file);
    if (!file) {
      return res.status(404).json({ success: false, message: "Associated file not found" });
    }

    const project = await Project.findById(file.project);
    if (!project) {
      return res.status(404).json({ success: false, message: "Associated project not found" });
    }

    req.versionDocument = version;
    req.fileDocument = file;
    req.project = project;
    
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = resolveVersion;
