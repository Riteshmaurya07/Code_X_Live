const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        // Password only required for local auth (not Google/GitHub OAuth)
        return this.authProvider === "local";
      },
      minlength: 6,
    },
    avatar: {
      type: String,
      default: "",
    },
    // Firebase Authentication fields
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true, // Allow null values while maintaining uniqueness
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    followers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    following: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
  },
  { timestamps: true }
);

// Hash password before saving (only for local auth)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
