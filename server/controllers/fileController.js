const File = require("../models/File");
const Project = require("../models/Project");
const Version = require("../models/Version");
const ActivityLog = require("../models/ActivityLog");
const logger = require("../utils/logger");
const ACTIONS = require("../Actions");

// Create a new file in a project
const createFile = async (req, res, next) => {
  try {
    const { name, language, path, content } = req.body;
    let { projectId } = req.params;

    // Resolve projectId (could be ObjectId, roomId/UUID, or shareToken)
    let project;
    if (projectId.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(projectId);
    }
    
    if (!project) {
      project = await Project.findOne({
        $or: [{ roomId: projectId }, { shareToken: projectId }],
      });
    }

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Always use the database ObjectId for internal operations
    projectId = project._id;

    const file = await File.create({
      name,
      project: projectId,
      language: language || "nodejs",
      path: path || "/",
      content: content || "",
    });

    // Log activity
    await ActivityLog.create({
      project: projectId,
      user: req.user?._id,
      username: req.user?.username,
      action: "file_created",
      details: `Created file: ${name}`,
    });

    // Emit FILE_CREATED to all users in the room (use roomId if available, fallback to ObjectId)
    const io = req.app.get("io");
    if (io) {
      const roomIdentifier = project.roomId || String(projectId);
      io.to(roomIdentifier).emit(ACTIONS.FILE_CREATED, { file });
    }

    logger.info(`File created: ${name} in project ${projectId}`);
    res.status(201).json(file);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "File already exists at this path" });
    }
    next(err);
  }
};

// Get a single file by ID
const getFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    res.json(file);
  } catch (err) {
    next(err);
  }
};

// Update file content (creates a version snapshot)
const updateFile = async (req, res, next) => {
  try {
    const { content, name } = req.body;
    const file = await File.findById(req.params.id).populate("project");

    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // Create version snapshot before updating
    await Version.create({
      project: file.project,
      file: file._id,
      content: file.content,
      author: req.user?._id,
      label: `Save at ${new Date().toLocaleTimeString()}`,
    });

    // Update the file
    if (content !== undefined) file.content = content;
    if (name) file.name = name;
    await file.save();

    // Log activity
    await ActivityLog.create({
      project: file.project,
      user: req.user?._id,
      username: req.user?.username,
      action: "file_saved",
      details: `Saved file: ${file.name}`,
    });

    // Emit FILE_RENAMED if name was changed
    if (name) {
      const io = req.app.get("io");
      if (io) {
        const roomIdentifier = file.project?.roomId || String(file.project?._id || file.project);
        io.to(roomIdentifier).emit(ACTIONS.FILE_RENAMED, {
          fileId: file._id,
          newName: file.name,
        });
      }
    }

    logger.info(`File saved: ${file.name} (version snapshot created)`);
    res.json(file);
  } catch (err) {
    next(err);
  }
};

// Autosave — updates file WITHOUT creating version snapshot
const autosaveFile = async (req, res, next) => {
  try {
    const { fileId, content } = req.body;

    if (!fileId) {
      return res.status(400).json({ success: false, message: "fileId is required" });
    }

    const file = await File.findByIdAndUpdate(
      fileId,
      { content },
      { new: true }
    );

    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
};

// Get version history for a file
const getFileVersions = async (req, res, next) => {
  try {
    const versions = await Version.find({ file: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "username");

    res.json(versions);
  } catch (err) {
    next(err);
  }
};

// Restore a version
const restoreVersion = async (req, res, next) => {
  try {
    const version = await Version.findById(req.params.versionId);
    if (!version) {
      return res.status(404).json({ success: false, message: "Version not found" });
    }

    const file = await File.findById(version.file);
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // Create snapshot of current state before restoring
    await Version.create({
      project: file.project,
      file: file._id,
      content: file.content,
      author: req.user?._id,
      label: "Before restore",
    });

    file.content = version.content;
    await file.save();

    logger.info(`Version restored for file ${file.name}`);
    res.json({ success: true, file });
  } catch (err) {
    next(err);
  }
};

// Delete a file
const deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id).populate("project");
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    
    await File.findByIdAndDelete(req.params.id);

    // Clean up versions
    await Version.deleteMany({ file: file._id });

    // Log activity
    await ActivityLog.create({
      project: file.project,
      user: req.user?._id,
      username: req.user?.username,
      action: "file_deleted",
      details: `Deleted file: ${file.name}`,
    });

    // Emit FILE_DELETED to all users in the room
    const io = req.app.get("io");
    if (io) {
      const roomIdentifier = file.project?.roomId || String(file.project?._id || file.project);
      io.to(roomIdentifier).emit(ACTIONS.FILE_DELETED, {
        fileId: file._id,
      });
    }

    logger.info(`File deleted: ${file.name}`);
    res.json({ success: true, message: "File deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createFile,
  getFile,
  updateFile,
  autosaveFile,
  getFileVersions,
  restoreVersion,
  deleteFile,
};
