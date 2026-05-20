/**
 * languageConfig.js — Language mappings & configuration for Monaco Editor.
 *
 * Maps the project's language identifiers (used in LANGUAGES array, DB, JDoodle)
 * to Monaco language IDs, file extensions, and display names.
 */

// ── Language Map ──────────────────────────────────────────────────────
// Key = internal language identifier (matches LANGUAGES array & DB)
// Value = Monaco language ID, default file extension, display name
export const LANGUAGE_MAP = {
  javascript: { monacoId: "javascript", ext: ".js", label: "JavaScript" },
  nodejs:     { monacoId: "javascript", ext: ".js", label: "Node.js" },
  typescript: { monacoId: "typescript", ext: ".ts", label: "TypeScript" },
  python3:    { monacoId: "python",     ext: ".py", label: "Python" },
  java:       { monacoId: "java",       ext: ".java", label: "Java" },
  cpp:        { monacoId: "cpp",        ext: ".cpp", label: "C++" },
  c:          { monacoId: "c",          ext: ".c",  label: "C" },
  csharp:     { monacoId: "csharp",     ext: ".cs", label: "C#" },
  ruby:       { monacoId: "ruby",       ext: ".rb", label: "Ruby" },
  go:         { monacoId: "go",         ext: ".go", label: "Go" },
  rust:       { monacoId: "rust",       ext: ".rs", label: "Rust" },
  php:        { monacoId: "php",        ext: ".php", label: "PHP" },
  swift:      { monacoId: "swift",      ext: ".swift", label: "Swift" },
  r:          { monacoId: "r",          ext: ".r",  label: "R" },
  bash:       { monacoId: "shell",      ext: ".sh", label: "Bash" },
  sql:        { monacoId: "sql",        ext: ".sql", label: "SQL" },
  scala:      { monacoId: "scala",      ext: ".scala", label: "Scala" },
  pascal:     { monacoId: "pascal",     ext: ".pas", label: "Pascal" },
  html:       { monacoId: "html",       ext: ".html", label: "HTML" },
  css:        { monacoId: "css",        ext: ".css", label: "CSS" },
  json:       { monacoId: "json",       ext: ".json", label: "JSON" },
};

/**
 * Get Monaco language ID from internal language identifier.
 * Falls back to "plaintext" for unknown languages.
 */
export const getMonacoLanguage = (language) => {
  return LANGUAGE_MAP[language]?.monacoId || "plaintext";
};

/**
 * Detect Monaco language from file extension.
 */
export const getLanguageFromFilename = (filename) => {
  if (!filename) return "plaintext";
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  const extMap = {
    ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript",
    ".py": "python",
    ".java": "java",
    ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".hpp": "cpp",
    ".c": "c", ".h": "c",
    ".cs": "csharp",
    ".rb": "ruby",
    ".go": "go",
    ".rs": "rust",
    ".php": "php",
    ".swift": "swift",
    ".r": "r", ".R": "r",
    ".sh": "shell", ".bash": "shell",
    ".sql": "sql",
    ".scala": "scala",
    ".pas": "pascal",
    ".html": "html", ".htm": "html",
    ".css": "css", ".scss": "scss", ".less": "less",
    ".json": "json",
    ".md": "markdown",
    ".xml": "xml",
    ".yaml": "yaml", ".yml": "yaml",
  };
  return extMap[ext] || "plaintext";
};

/**
 * Get all available language options for the language selector.
 */
export const EDITOR_LANGUAGES = [
  "python3", "java", "cpp", "nodejs", "javascript", "typescript",
  "c", "ruby", "go", "scala", "bash", "sql", "pascal", "csharp",
  "php", "swift", "rust", "r", "html", "css", "json"
];
