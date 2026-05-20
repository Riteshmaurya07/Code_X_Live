const express = require("express");
const router = express.Router();
const {
  reviewCode,
  explainCode,
  fixCode,
  generateTests,
  chat,
  autocomplete,
} = require("../controllers/aiController");

router.post("/review", reviewCode);
router.post("/explain", explainCode);
router.post("/fix", fixCode);
router.post("/tests", generateTests);
router.post("/chat", chat);
router.post("/autocomplete", autocomplete);

module.exports = router;
