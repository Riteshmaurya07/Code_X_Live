const express = require("express");
const router = express.Router();
const { formatCode } = require("../controllers/formatController");

// Format endpoint — no auth required (for quick formatting)
router.post("/", formatCode);

module.exports = router;
