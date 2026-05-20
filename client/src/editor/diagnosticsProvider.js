/**
 * diagnosticsProvider.js — Real-time inline diagnostics for Monaco.
 *
 * JS/TS diagnostics are handled natively by Monaco's TypeScript worker.
 * This module provides a lightweight marker-based diagnostic API for
 * languages that don't have built-in Monaco workers (Python, Java, C++, etc.)
 * by doing basic syntax checks client-side.
 */
import { monaco } from "./monacoSetup";

const OWNER = "codexlive-diagnostics";

// ── Bracket / syntax checking ─────────────────────────────────────────

const BRACKET_PAIRS = {
  "(": ")", "[": "]", "{": "}",
};
const OPEN_BRACKETS = new Set(Object.keys(BRACKET_PAIRS));
const CLOSE_BRACKETS = new Set(Object.values(BRACKET_PAIRS));
const CLOSE_TO_OPEN = Object.fromEntries(
  Object.entries(BRACKET_PAIRS).map(([o, c]) => [c, o])
);

/**
 * Check for mismatched brackets/parentheses.
 */
const checkBrackets = (model) => {
  const markers = [];
  const content = model.getValue();
  const stack = [];
  let inString = false;
  let stringChar = "";
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    // Track comments
    if (!inString && !inBlockComment && ch === "/" && next === "/") {
      inLineComment = true;
      continue;
    }
    if (inLineComment && ch === "\n") {
      inLineComment = false;
      continue;
    }
    if (inLineComment) continue;

    if (!inString && !inLineComment && ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (inBlockComment && ch === "*" && next === "/") {
      inBlockComment = false;
      i++;
      continue;
    }
    if (inBlockComment) continue;

    // Track strings
    if (!inString && (ch === '"' || ch === "'" || ch === "`")) {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (inString && ch === stringChar && content[i - 1] !== "\\") {
      inString = false;
      continue;
    }
    if (inString) continue;

    // Check brackets
    if (OPEN_BRACKETS.has(ch)) {
      const pos = model.getPositionAt(i);
      stack.push({ char: ch, pos, index: i });
    } else if (CLOSE_BRACKETS.has(ch)) {
      const expected = CLOSE_TO_OPEN[ch];
      if (stack.length === 0 || stack[stack.length - 1].char !== expected) {
        const pos = model.getPositionAt(i);
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Unmatched closing bracket '${ch}'`,
          startLineNumber: pos.lineNumber,
          startColumn: pos.column,
          endLineNumber: pos.lineNumber,
          endColumn: pos.column + 1,
          source: OWNER,
        });
      } else {
        stack.pop();
      }
    }
  }

  // Remaining unclosed brackets
  for (const item of stack) {
    markers.push({
      severity: monaco.MarkerSeverity.Error,
      message: `Unclosed bracket '${item.char}'`,
      startLineNumber: item.pos.lineNumber,
      startColumn: item.pos.column,
      endLineNumber: item.pos.lineNumber,
      endColumn: item.pos.column + 1,
      source: OWNER,
    });
  }

  return markers;
};

let diagnosticsTimer = null;

/**
 * Run diagnostics on a model with debounce.
 * JS/TS/JSON/HTML/CSS are handled by native Monaco workers — skip them.
 */
export const runDiagnostics = (model) => {
  if (!model) return;

  const lang = model.getLanguageId();

  // Monaco handles these natively via workers
  const nativeLanguages = new Set([
    "javascript", "typescript", "json", "html", "css", "scss", "less",
  ]);
  if (nativeLanguages.has(lang)) return;

  if (diagnosticsTimer) clearTimeout(diagnosticsTimer);
  diagnosticsTimer = setTimeout(() => {
    const markers = checkBrackets(model);
    monaco.editor.setModelMarkers(model, OWNER, markers);
  }, 500);
};

/**
 * Clear custom diagnostics for a model.
 */
export const clearDiagnostics = (model) => {
  if (model) {
    monaco.editor.setModelMarkers(model, OWNER, []);
  }
};

/**
 * Get all markers (from all sources) for a model.
 */
export const getMarkers = (model) => {
  if (!model) return [];
  return monaco.editor.getModelMarkers({ resource: model.uri });
};
