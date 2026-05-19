const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { verifyFirebaseToken } = require("../config/firebaseAdmin");
const { sendMail } = require("../config/mailer");
const { passwordResetEmail } = require("../utils/emailTemplates");
const logger = require("../utils/logger");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Register a new user (local email/password)
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: "Username is already taken. Please choose another one." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const user = await User.create({
      username, email, password,
      authProvider: "local",
      providers: ["local"],
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      providers: user.providers,
      token: generateToken(user._id),
    });
  } catch (err) {
    logger.error(`Register error: ${err.message}`);
    res.status(500).json({ error: "Registration failed" });
  }
};

// Login an existing user (local email/password)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // If user signed up via OAuth and has no password
    if (user.authProvider !== "local" && !user.password) {
      return res.status(401).json({
        error: `This account uses ${user.authProvider} sign-in. Please use the ${user.authProvider} button to log in.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      authProvider: user.authProvider,
      providers: user.providers,
      token: generateToken(user._id),
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    res.status(500).json({ error: "Login failed" });
  }
};

/**
 * Firebase/OAuth Login — verifies Firebase ID token, finds or creates user.
 *
 * Account linking strategy:
 *   1. Look up by firebaseUid first (fastest, most reliable).
 *   2. If not found, look up by email.
 *   3. If email match found, link the Firebase UID and add the new provider.
 *   4. If no match at all, create a new user.
 *
 * This ensures a single MongoDB user document per email, regardless of how
 * many OAuth providers (Google, GitHub) are linked on the Firebase side.
 */
const firebaseLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: "Firebase ID token is required" });
    }

    // Verify the Firebase token
    const decoded = await verifyFirebaseToken(idToken);
    const { uid, email, name, picture } = decoded;
    const provider = decoded.firebase?.sign_in_provider || "google.com";

    // Determine auth provider label
    let authProvider = "google";
    if (provider.includes("github")) authProvider = "github";

    // Provide a fallback email if OAuth (like GitHub) doesn't return one
    const safeEmail = email || `${uid}@github.local`;

    // ── Step 1: Try to find by Firebase UID ──
    let user = await User.findOne({ firebaseUid: uid });

    if (user) {
      // User exists — ensure this provider is in the providers array
      let updated = false;

      if (!user.providers.includes(authProvider)) {
        user.providers.push(authProvider);
        updated = true;
      }

      // Update avatar if missing
      if (picture && !user.avatar) {
        user.avatar = picture;
        updated = true;
      }

      if (updated) await user.save();

    } else {
      // ── Step 2: Try to find by email ──
      user = await User.findOne({ email: safeEmail });

      if (user) {
        // Email match — link Firebase UID and add provider
        user.firebaseUid = uid;

        if (!user.providers.includes(authProvider)) {
          user.providers.push(authProvider);
        }

        // Keep authProvider as the original one, unless it was "local"
        // and now they're linking an OAuth provider
        if (user.authProvider === "local") {
          // User originally registered locally, now linking OAuth
          // Keep authProvider as "local" but add the new provider
        } else if (user.authProvider !== authProvider) {
          // Already has a different OAuth provider, just add to array
        }

        if (picture && !user.avatar) user.avatar = picture;
        await user.save();

        logger.info(`Linked Firebase UID to existing user: ${user.username} (added ${authProvider})`);

      } else {
        // ── Step 3: Create a brand new user ──
        let baseName = name || safeEmail.split("@")[0];
        let username = baseName.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

        // Ensure username is unique
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          username = `${username}${Date.now().toString(36).slice(-4)}`;
        }

        // Ensure minimum length
        if (username.length < 3) {
          username = `user_${Date.now().toString(36).slice(-6)}`;
        }

        user = await User.create({
          username,
          email: safeEmail,
          firebaseUid: uid,
          authProvider,
          providers: [authProvider],
          avatar: picture || "",
        });

        logger.info(`New OAuth user created: ${user.username} (${authProvider})`);
      }
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      authProvider: user.authProvider,
      providers: user.providers,
      token: generateToken(user._id),
    });
  } catch (err) {
    logger.error(`Firebase login error: ${err.message}`);
    if (err.code === "auth/id-token-expired") {
      return res.status(401).json({ error: "Firebase token expired. Please try again." });
    }
    res.status(500).json({ error: "OAuth login failed" });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  res.json(req.user);
};

// Forgot Password — sends reset link
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: "If an account exists with that email, a reset link has been sent." });
    }

    if (user.authProvider !== "local") {
      return res.status(400).json({ error: `This account uses ${user.authProvider} sign-in. Password reset is not available.` });
    }

    // Cooldown check (2 minutes)
    if (user.resetPasswordExpire && (user.resetPasswordExpire - Date.now() > 3600000 - 120000)) {
      const remainingSecs = Math.ceil((user.resetPasswordExpire - Date.now() - (3600000 - 120000)) / 1000);
      return res.status(429).json({ 
        error: `Please wait ${remainingSecs}s before requesting another reset link.` 
      });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const html = passwordResetEmail(resetUrl);

    try {
      await sendMail(user.email, "Password Reset Request", html);
      res.json({ message: "Reset link sent to your email." });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      logger.error(`Reset email failed: ${err.message}`);
      res.status(500).json({ error: "Failed to send reset email. Please try again later." });
    }
  } catch (err) {
    logger.error(`Forgot password error: ${err.message}`);
    res.status(500).json({ error: "An error occurred. Please try again." });
  }
};

// Reset Password — verifies token and updates password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful! You can now log in." });
  } catch (err) {
    logger.error(`Reset password error: ${err.message}`);
    res.status(500).json({ error: "Failed to reset password" });
  }
};

module.exports = { register, login, firebaseLogin, getProfile, forgotPassword, resetPassword };
