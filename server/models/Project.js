const mongoose = require("mongoose");
const crypto = require("crypto");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["editor", "viewer"],
          default: "editor",
        },
      },
    ],
    language: {
      type: String,
      default: "nodejs",
    },
    roomId: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    shareToken: {
      type: String,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes
projectSchema.index({ owner: 1, updatedAt: -1 });
projectSchema.index({ name: "text" }, { default_language: "none", language_override: "textSearchLanguage" });
projectSchema.index({ roomId: 1 }, { unique: true, sparse: true });
projectSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

// Pre-save hook to ensure roomId and shareToken exist
projectSchema.pre("save", function (next) {
  if (!this.roomId) {
    this.roomId = crypto.randomBytes(5).toString("hex"); // 10 chars
  }
  if (!this.shareToken) {
    this.shareToken = crypto.randomBytes(8).toString("hex"); // 16 chars
  }
  next();
});

module.exports = mongoose.model("Project", projectSchema);
