const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "nodejs",
    },
    path: {
      type: String,
      default: "/",
    },
    yjsState: {
      type: Buffer,
      default: null,
    },
    yjsUpdates: [
      {
        id: { type: String, required: true },
        update: { type: Buffer, required: true },
      }
    ],
    compactionVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Ensure unique file names within a project at the same path
fileSchema.index({ project: 1, name: 1, path: 1 }, { unique: true });

module.exports = mongoose.model("File", fileSchema);
