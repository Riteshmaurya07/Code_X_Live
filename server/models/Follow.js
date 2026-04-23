const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for fast lookups
// 1. Finding who a user is following
followSchema.index({ follower: 1, createdAt: -1 });
// 2. Finding who is following a user
followSchema.index({ following: 1, createdAt: -1 });
// 3. Ensuring a user can't follow the same person twice
followSchema.index({ follower: 1, following: 1 }, { unique: true });

module.exports = mongoose.model("Follow", followSchema);
