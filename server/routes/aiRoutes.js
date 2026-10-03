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
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");

const aiProjectCheck = (req, res, next) => {
  if (req.body.projectId) {
    return checkPermission("owner", "editor", "viewer")(req, res, next);
  }
  next();
};

router.use(auth);
router.use(aiProjectCheck);

router.post("/review", reviewCode);
router.post("/explain", explainCode);
router.post("/fix", fixCode);
router.post("/tests", generateTests);
router.post("/chat", chat);
router.post("/autocomplete", autocomplete);

module.exports = router;
