const axios = require("axios");
const Project = require("../models/Project");
const File = require("../models/File");
const ActivityLog = require("../models/ActivityLog");
const logger = require("../utils/logger");

// File extensions to import (ignore binaries, large files, etc.)
const ALLOWED_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "hpp",
  "cs", "go", "rs", "rb", "php", "swift", "kt", "scala", "r",
  "html", "css", "scss", "less", "json", "xml", "yaml", "yml",
  "md", "txt", "sh", "bash", "sql", "env", "gitignore",
  "dockerfile", "toml", "cfg", "ini", "vue", "svelte",
]);

const MAX_FILE_SIZE = 100 * 1024; // 100KB per file
const MAX_FILES = 50;

// Detect language from file extension
const detectLanguage = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  const langMap = {
    js: "nodejs", jsx: "nodejs", ts: "typescript", tsx: "typescript",
    py: "python3", java: "java", c: "c", cpp: "cpp", h: "c", hpp: "cpp",
    cs: "csharp", go: "go", rs: "rust", rb: "ruby", php: "php",
    swift: "swift", kt: "kotlin", scala: "scala", r: "r",
    html: "html", css: "css", json: "json", md: "markdown",
    sh: "bash", bash: "bash", sql: "sql",
  };
  return langMap[ext] || "text";
};

const importGitHubRepo = async (req, res, next) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ success: false, message: "GitHub URL is required" });
    }

    // Parse URL: https://github.com/owner/repo or https://github.com/owner/repo.git
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.\s]+)/);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid GitHub URL" });
    }

    const [, owner, repo] = match;
    logger.info(`Importing GitHub repo: ${owner}/${repo}`);

    // Fetch repo tree (try main, then master)
    let tree;
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    for (const branch of ["main", "master"]) {
      try {
        const treeRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
          { headers }
        );
        tree = treeRes.data.tree;
        break;
      } catch {
        continue;
      }
    }

    if (!tree) {
      return res.status(400).json({
        success: false,
        message: "Could not access repository. Make sure it is public.",
      });
    }

    // Filter to allowed file types and blobs only
    const files = tree
      .filter((item) => item.type === "blob")
      .filter((item) => {
        const ext = item.path.split(".").pop().toLowerCase();
        return ALLOWED_EXTENSIONS.has(ext);
      })
      .filter((item) => item.size <= MAX_FILE_SIZE)
      .slice(0, MAX_FILES);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No importable files found in the repository",
      });
    }

    // Create project
    const project = await Project.create({
      name: `${owner}/${repo}`,
      owner: req.user._id,
      language: "nodejs", // Default; will be overridden by first file
    });

    // Fetch and create each file
    let importedCount = 0;
    for (const item of files) {
      try {
        const contentRes = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`,
          { headers }
        );

        const content = Buffer.from(contentRes.data.content, "base64").toString("utf-8");
        const name = item.path.split("/").pop();
        const filePath = "/" + item.path.split("/").slice(0, -1).join("/");

        await File.create({
          name,
          project: project._id,
          content,
          language: detectLanguage(name),
          path: filePath || "/",
        });

        importedCount++;
      } catch (fileErr) {
        logger.warn(`Skipped file ${item.path}: ${fileErr.message}`);
      }
    }

    // Update project language from the most common file type
    if (importedCount > 0) {
      const firstFile = await File.findOne({ project: project._id });
      if (firstFile) {
        project.language = firstFile.language;
        await project.save();
      }
    }

    await ActivityLog.create({
      project: project._id,
      user: req.user._id,
      username: req.user.username,
      action: "github_import",
      details: `Imported ${importedCount} files from ${owner}/${repo}`,
    });

    logger.info(`GitHub import complete: ${importedCount} files from ${owner}/${repo}`);

    res.status(201).json({
      success: true,
      project,
      filesImported: importedCount,
      totalFilesInRepo: files.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { importGitHubRepo };
