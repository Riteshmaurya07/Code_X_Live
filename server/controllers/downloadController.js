/**
 * downloadController.js — Streams all project files as a .zip archive.
 */
const archiver = require("archiver");
const Project = require("../models/Project");
const File = require("../models/File");
const logger = require("../utils/logger");

const downloadProject = async (req, res) => {
  try {
    const { id } = req.params;
    let project;

    // Try ObjectId first, then roomId slug
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(id).populate("owner", "_id").populate("collaborators.user", "_id");
    }
    if (!project) {
      project = await Project.findOne({ roomId: id }).populate("owner", "_id").populate("collaborators.user", "_id");
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Auth check — must be owner or collaborator
    const userId = req.user._id.toString();
    const isOwner = project.owner._id.toString() === userId;
    const isCollaborator = project.collaborators.some(
      (c) => c.user && c.user._id.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch all files for the project
    const files = await File.find({ project: project._id });

    // Set response headers for ZIP download
    const safeName = project.name.replace(/[^a-z0-9_\-. ]/gi, "_");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.zip"`
    );

    // Create archiver and pipe to response
    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("error", (err) => {
      logger.error(`Archiver error for project ${id}: ${err.message}`);
      // Can't change headers after streaming starts — just destroy
      res.destroy(err);
    });

    archive.pipe(res);

    for (const file of files) {
      const filePath = file.path && file.path !== "/" ? `${file.path}/${file.name}` : file.name;
      archive.append(file.content || "", { name: filePath });
    }

    await archive.finalize();
  } catch (err) {
    logger.error(`Download project error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate ZIP" });
    }
  }
};

module.exports = { downloadProject };
