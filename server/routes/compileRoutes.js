const express = require("express");
const router = express.Router();
const { compileCode } = require("../controllers/compileController");
const auth = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");

const compileProjectCheck = (req, res, next) => {
  if (req.body.projectId) {
    return checkPermission("owner", "editor", "viewer")(req, res, next);
  }
  next();
};

router.use(auth);
router.use(compileProjectCheck);

router.post("/", compileCode);

module.exports = router;
