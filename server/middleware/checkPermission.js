const Project = require("../models/Project");

/**
 * Factory: returns middleware that checks permission on the project.
 * @param  {...string} roles  Allowed roles, e.g. "owner", "editor", "viewer"
 */
const checkPermission = (...roles) => {
  return async (req, res, next) => {
    try {
      // Allow upstream middleware (like resolveFile) to provide the project
      let project = req.project;

      if (!project) {
        // Find project ID from various possible sources
        // Note: req.originalUrl can be used to avoid pulling file ID as project ID
        let projectId = req.params.projectId || req.body.projectId || req.query.projectId;
        
        // If the route is /api/projects/:id, then req.params.id is the project ID
        if (!projectId && req.baseUrl && req.baseUrl.includes("/api/projects") && req.params.id) {
          projectId = req.params.id;
        }

        // Catch for some sharing endpoints that use /api/projects/:id like format
        if (!projectId && req.params.id) {
            projectId = req.params.id;
        }

        if (!projectId) {
          return res.status(400).json({ success: false, message: "Project ID required for authorization" });
        }

        if (typeof projectId !== "string") {
          return res.status(400).json({ success: false, message: "Invalid project ID format" });
        }

        // Let's see if projectId is an ObjectId or something else
        if (projectId.match(/^[0-9a-fA-F]{24}$/)) {
          project = await Project.findById(projectId);
        } else {
          // Might be a roomId or shareToken
          project = await Project.findOne({
            $or: [{ roomId: projectId }, { shareToken: projectId }],
          });
        }

        if (!project) {
          return res.status(404).json({ success: false, message: "Project not found" });
        }
      }

      if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: "Unauthenticated" });
      }

      const userId = req.user._id.toString();

      // Owner always has access
      if (project.owner.toString() === userId) {
        req.project = project;
        req.userRole = "owner";
        return next();
      }

      // Check collaborator role
      const collab = project.collaborators.find(
        (c) => c.user && c.user.toString() === userId
      );

      if (!collab) {
        return res.status(403).json({ success: false, message: "Access denied: You are not a collaborator on this project" });
      }

      if (!roles.includes(collab.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied: Requires ${roles.join(" or ")} role`,
        });
      }

      req.project = project;
      req.userRole = collab.role;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = checkPermission;
