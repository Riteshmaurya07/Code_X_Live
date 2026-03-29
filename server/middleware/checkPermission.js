const Project = require("../models/Project");

/**
 * Factory: returns middleware that checks permission on the project.
 * @param  {...string} roles  Allowed roles, e.g. "owner", "editor", "viewer"
 */
const checkPermission = (...roles) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.id || req.params.projectId;
      if (!projectId) {
        return res.status(400).json({ success: false, message: "Project ID required" });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
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
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      if (!roles.includes(collab.role) && !roles.includes("viewer")) {
        return res.status(403).json({
          success: false,
          message: `Requires ${roles.join(" or ")} role`,
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
