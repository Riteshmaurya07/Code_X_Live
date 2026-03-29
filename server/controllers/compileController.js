const axios = require("axios");
const logger = require("../utils/logger");
const { logActivity } = require("./activityController");

const compileCode = async (req, res, next) => {
  try {
    const { code, language, projectId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    // JDoodle language mapping
    const langMap = {
      "python3": { lang: "python3", version: "4" },
      "nodejs": { lang: "nodejs", version: "4" },
      "javascript": { lang: "nodejs", version: "4" },
      "java": { lang: "java", version: "4" },
      "cpp": { lang: "cpp17", version: "1" },
      "c": { lang: "c", version: "4" },
      "ruby": { lang: "ruby", version: "4" },
      "go": { lang: "go", version: "4" },
      "rust": { lang: "rust", version: "4" },
      "php": { lang: "php", version: "4" },
      "csharp": { lang: "csharp", version: "4" },
    };

    const target = langMap[language] || { lang: language, version: "0" };

    const startTime = Date.now();

    const response = await axios.post(
      "https://api.jdoodle.com/v1/execute",
      {
        script: code,
        language: target.lang,
        versionIndex: target.version,
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
      }
    );

    const executionTime = `${Date.now() - startTime}ms`;

    if (projectId) {
      logActivity(projectId, req.user?._id, req.user?.username, "code_executed", `Executed ${language} code`);
    }

    logger.info(`Code executed (${language}) in ${executionTime}`);

    res.json({
      output: response.data.output,
      executionTime,
      statusCode: response.data.statusCode,
      memory: response.data.memory,
      cpuTime: response.data.cpuTime,
    });
  } catch (err) {
    if (err.response) {
      logger.error(`JDoodle Error (${err.response.status}): ${JSON.stringify(err.response.data)}`);
    }
    next(err);
  }
};

module.exports = { compileCode };
