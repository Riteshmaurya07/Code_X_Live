const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File",
    required: true,
  },
  content: {
    type: String,
    default: "",
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  label: {
    type: String,
    default: "",
  },
}, { timestamps: true });

versionSchema.index({ file: 1, createdAt: -1 });

module.exports = mongoose.model("Version", versionSchema);
