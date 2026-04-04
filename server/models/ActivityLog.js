const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
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
    ],
    required: true,
  },
  details: {
    type: String,
    default: "",
  },
}, { timestamps: true });

activityLogSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
