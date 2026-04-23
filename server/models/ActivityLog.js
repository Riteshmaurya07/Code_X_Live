const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: false, // Made optional to support global user actions
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  username: {
    type: String,
    default: "Anonymous",
  },
  action: {
    type: String,
    enum: [
      "user_joined",
      "user_left",
      "file_created",
      "file_deleted",
      "file_saved",
      "ai_review",
      "ai_explain",
      "ai_fix",
      "ai_tests",
      "ai_chat",
      "code_executed",
      "collaborator_invited",
      "collaborator_removed",
      "project_updated",
      "github_import",
      "user_followed",
      "user_login",
      "project_created",
      "invitation_received",
      "invitation_accepted"
    ],
    required: true,
  },
  details: {
    type: String,
    default: "",
  },
}, { timestamps: true });

activityLogSchema.index({ project: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

module.exports = mongoose.model("ActivityLog", activityLogSchema);
