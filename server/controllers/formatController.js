const prettier = require("prettier");
const logger = require("../utils/logger");

// Map CodeXLive language names to Prettier parser names
const parserMap = {
  javascript: "babel",
  nodejs: "babel",
  html: "html",
  css: "css",
  json: "json",
  markdown: "markdown",
  typescript: "typescript",
  // Languages not supported by Prettier — return as-is
};

const formatCode = async (req, res, next) => {
  try {
    const { code, language } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Code is required" });
    }

    const parser = parserMap[language];

    if (!parser) {
      // Language not supported by Prettier — return original code
      return res.json({
        formatted: code,
        supported: false,
        message: `Prettier does not support ${language}. Code returned as-is.`,
      });
    }

    const formatted = await prettier.format(code, {
      parser,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: "es5",
      printWidth: 80,
    });

    logger.info(`Formatted ${language} code (${code.length} → ${formatted.length} chars)`);
    res.json({ formatted, supported: true });
  } catch (err) {
    // Prettier throws on syntax errors — return helpful message
    if (err.message && err.message.includes("SyntaxError")) {
      return res.status(400).json({
        success: false,
        message: "Cannot format: code has syntax errors",
        details: err.message.split("\n").slice(0, 5).join("\n"),
      });
    }
    next(err);
  }
};

module.exports = { formatCode };
