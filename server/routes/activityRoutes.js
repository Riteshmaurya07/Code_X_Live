const express = require("express");
const router = express.Router();
const { getProjectActivity } = require("../controllers/activityController");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/:id/activity", getProjectActivity);

module.exports = router;
