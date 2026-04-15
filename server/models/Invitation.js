const mongoose = require("mongoose");
const crypto = require("crypto");

const invitationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["editor", "viewer"],
      default: "editor",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  { timestamps: true }
);

// Index for fast lookups
invitationSchema.index({ invitedUser: 1, status: 1 });
invitationSchema.index({ project: 1, invitedUser: 1 }, { unique: true });

module.exports = mongoose.model("Invitation", invitationSchema);
