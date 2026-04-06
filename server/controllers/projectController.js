const Project = require("../models/Project");
const File = require("../models/File");
const Version = require("../models/Version");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("./activityController");
const Session = require("../models/Session");

// Create a new project
const createProject = async (req, res) => {
  try {
    const { name, language } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = await Project.create({
      name,
      language: language || "javascript",
      owner: req.user._id,
    });

    // Create a default file
    await File.create({
      name: language === "python3" ? "main.py" : "index.js",
      project: project._id,
      content: "// Start coding here\n",
      language: language || "javascript",
    });

    // Log activity
    await logActivity(
      project._id,
      req.user._id,
      req.user.username,
      "project_created",
      `Created project "${name}"`
    );

    res.status(201).json(project);
  } catch (err) {
    console.error("Create project error:", err.message);
    res.status(500).json({ error: "Failed to create project" });
  }
};

// Get all projects for the current user
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { "collaborators.user": req.user._id }],
    })
      .sort({ updatedAt: -1 })
      .populate("owner", "username")
      .populate("collaborators.user", "username");

    res.json(projects);
  } catch (err) {
    console.error("Get projects error:", err.message);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
};

const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    let project;

    // Try finding by ObjectID first (default behavior)
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(id).populate("owner", "username");
    }

    // If not found by ID, try finding by custom roomId slug
    if (!project) {
      project = await Project.findOne({ roomId: id }).populate("owner", "username");
    }

    // Finally, fallback to shareToken in case someone directly navigates to /editor/:shareToken
    if (!project) {
      project = await Project.findOne({ shareToken: id }).populate("owner", "username");
    }

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const files = await File.find({ project: project._id }).sort({
      name: 1,
    });

    res.json({ project, files });
  } catch (err) {
    console.error("Get project error:", err.message);
    res.status(500).json({ error: "Failed to fetch project" });
  }
};

// Update project details
const updateProject = async (req, res) => {
  try {
    const { name, language, isPublic } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name, language, isPublic },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    console.error("Update project error:", err.message);
    res.status(500).json({ error: "Failed to update project" });
  }
};

// Delete a project and its files
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    await File.deleteMany({ project: project._id });
    await Version.deleteMany({ project: project._id });
    await ActivityLog.deleteMany({ project: project._id });
    await Session.deleteMany({ project: project._id });

    res.json({ message: "Project and all associated data deleted successfully." });
  } catch (err) {
    console.error("Delete project error:", err.message);
    res.status(500).json({ error: "Failed to delete project" });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
