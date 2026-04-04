const express = require("express");
const router = express.Router();
const {
  reviewCode,
  explainCode,
  fixCode,
  generateTests,
  chat,
} = require("../controllers/aiController");

router.post("/review", reviewCode);
router.post("/explain", explainCode);
router.post("/fix", fixCode);
router.post("/tests", generateTests);
router.post("/chat", chat);

module.exports = router;
