const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyFirebaseToken } = require("../config/firebaseAdmin");
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

    const user = await User.create({ username, email, password, authProvider: "local" });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("Register error:", err.message);
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

    // If user signed up via OAuth, they can't login with password
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
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
};

// Firebase/OAuth Login — verifies Firebase ID token, finds or creates user
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

    // Determine auth provider
    let authProvider = "google";
    if (provider.includes("github")) authProvider = "github";

    // Try to find existing user by Firebase UID
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Check if a user with this email already exists (account linking)
      user = await User.findOne({ email });

      if (user) {
        // Link the Firebase UID to the existing account
        user.firebaseUid = uid;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
        logger.info(`Linked Firebase UID to existing user: ${user.username}`);
      } else {
        // Create a brand new user
        // Generate a unique username from email or display name
        let username = (name || email.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

        // Ensure username is unique
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
          username = `${username}${Date.now().toString(36).slice(-4)}`;
        }

        // Ensure minimum length
        if (username.length < 3) {
          username = `user_${Date.now().toString(36)}`;
        }

        user = await User.create({
          username,
          email,
          firebaseUid: uid,
          authProvider,
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

module.exports = { register, login, firebaseLogin, getProfile };
