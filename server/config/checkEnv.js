const logger = require("../utils/logger");

const checkEnv = () => {
  const required = [
    "MONGO_URI",
    "JWT_SECRET",
    "CLIENT_URL",
    "PORT",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Recommended keys (warn only)
  const recommended = ["GEMINI_API_KEY", "SMTP_API_KEY", "JDOODLE_CLIENT_ID", "JDOODLE_CLIENT_SECRET"];
  const availableRecommended = recommended.filter((key) => process.env[key]);
  
  if (availableRecommended.length < recommended.length) {
    const missingRec = recommended.filter((key) => !process.env[key]);
    logger.warn(`Missing recommended environment variables: ${missingRec.join(", ")}`);
  }

  logger.info("Environment variables validated successfully.");
};

module.exports = checkEnv;
