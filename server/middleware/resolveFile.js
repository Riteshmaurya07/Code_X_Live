const File = require("../models/File");
const Project = require("../models/Project");

/**
 * Middleware to resolve a file and its associated project.
 * It looks for a file ID in req.params.id, req.params.fileId, or req.body.fileId
 * If found, attaches req.file and req.project.
 */
const resolveFile = async (req, res, next) => {
  try {
    const fileId = req.params.id || req.params.fileId || req.body.fileId;

    if (!fileId) {
      return res.status(400).json({ success: false, message: "File ID required" });
    }

    if (typeof fileId !== "string" || !fileId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid file ID format" });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    const project = await Project.findById(file.project);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found for this file" });
    }

    req.fileDocument = file; // use fileDocument to avoid conflicts with multer's req.file if ever added
    req.project = project;
    
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = resolveFile;
