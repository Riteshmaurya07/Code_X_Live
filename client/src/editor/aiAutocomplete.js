/**
 * aiAutocomplete.js — AI-powered inline code completion using Gemini.
 *
 * Registers a Monaco InlineCompletionProvider that:
 * 1. Waits for the user to pause typing (debounced)
 * 2. Sends surrounding code context to the server
 * 3. Renders ghost text that can be accepted with Tab
 */
import { monaco } from "./monacoSetup";
import api from "../services/api";

let disposable = null;
let abortController = null;
let debounceTimer = null;

const DEBOUNCE_MS = 800;
const MAX_CONTEXT_LINES = 40;

/**
 * Extract context around the cursor for the AI prompt.
 */
const extractContext = (model, position) => {
  const totalLines = model.getLineCount();
  const curLine = position.lineNumber;

  // Prefix: lines before cursor
  const prefixStart = Math.max(1, curLine - MAX_CONTEXT_LINES);
  const prefixLines = [];
  for (let i = prefixStart; i < curLine; i++) {
    prefixLines.push(model.getLineContent(i));
  }
  // Include current line up to cursor
  const currentLineContent = model.getLineContent(curLine);
  prefixLines.push(currentLineContent.substring(0, position.column - 1));

  // Suffix: lines after cursor
  const suffixEnd = Math.min(totalLines, curLine + 10);
  const suffixLines = [currentLineContent.substring(position.column - 1)];
  for (let i = curLine + 1; i <= suffixEnd; i++) {
    suffixLines.push(model.getLineContent(i));
  }

  return {
    prefix: prefixLines.join("\n"),
    suffix: suffixLines.join("\n"),
    currentLine: currentLineContent,
  };
};

/**
 * Register the AI inline completion provider.
 * @param {boolean} enabled - Whether AI suggestions are active
 */
export const registerAIAutocomplete = (enabled = true) => {
  // Dispose previous registration
  if (disposable) {
    disposable.dispose();
    disposable = null;
  }

  if (!enabled) return;

  disposable = monaco.languages.registerInlineCompletionsProvider(
    { pattern: "**" }, // All languages
    {
      provideInlineCompletions: async (model, position, context, token) => {
        // Don't trigger if the user just accepted a suggestion
        if (context.triggerKind === monaco.languages.InlineCompletionTriggerKind.Explicit) {
          // Explicit trigger (e.g. Ctrl+Space) — proceed
        }

        // Cancel any pending request
        if (abortController) {
          abortController.abort();
        }

        // Debounce
        return new Promise((resolve) => {
          if (debounceTimer) clearTimeout(debounceTimer);

          debounceTimer = setTimeout(async () => {
            // If token is already cancelled, bail
            if (token.isCancellationRequested) {
              resolve({ items: [] });
              return;
            }

            const { prefix, suffix } = extractContext(model, position);

            // Skip if prefix is too short
            if (prefix.trim().length < 5) {
              resolve({ items: [] });
              return;
            }

            abortController = new AbortController();

            try {
              const language = model.getLanguageId();
              const { data } = await api.post(
                "/api/ai/autocomplete",
                { prefix, suffix, language, maxTokens: 150 },
                {
                  signal: abortController.signal,
                  timeout: 5000,
                }
              );

              if (token.isCancellationRequested || !data?.completion) {
                resolve({ items: [] });
                return;
              }

              const completion = data.completion;

              // Don't suggest if completion is empty or just whitespace
              if (!completion.trim()) {
                resolve({ items: [] });
                return;
              }

              resolve({
                items: [
                  {
                    insertText: completion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                  },
                ],
              });
            } catch (err) {
              // Silently fail — abort errors are expected
              if (err.name !== "AbortError" && err.name !== "CanceledError") {
                console.debug("[AI Autocomplete] Request failed:", err.message);
              }
              resolve({ items: [] });
            }
          }, DEBOUNCE_MS);
        });
      },

      freeInlineCompletions() {
        // No-op — nothing to clean up per request
      },
    }
  );
};

/**
 * Dispose the AI autocomplete provider.
 */
export const disposeAIAutocomplete = () => {
  if (disposable) {
    disposable.dispose();
    disposable = null;
  }
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
};
