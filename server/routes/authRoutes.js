const express = require("express");
const router = express.Router();
const { register, login, firebaseLogin, getProfile, forgotPassword, resetPassword } = require("../controllers/authController");
const auth = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/firebase", firebaseLogin); // Firebase OAuth login
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/profile", auth, getProfile);

module.exports = router;
