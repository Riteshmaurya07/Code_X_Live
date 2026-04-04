const express = require("express");
const router = express.Router();
const { importGitHubRepo } = require("../controllers/githubController");
const auth = require("../middleware/auth");

router.use(auth);

router.post("/import", importGitHubRepo);

module.exports = router;
