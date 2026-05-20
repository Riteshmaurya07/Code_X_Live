/**
 * monacoSetup.js — Central Monaco Editor initialization.
 *
 * Sets up the Monaco environment (web workers), registers custom themes,
 * and provides the default editor options used across the application.
 */
import * as monaco from "monaco-editor";

// ── Worker Setup ───────────────────────────────────────────────────────
// vite-plugin-monaco-editor handles worker bundling automatically.
// This fallback ensures workers load even if the plugin isn't present.
if (!self.MonacoEnvironment) {
  self.MonacoEnvironment = {
    getWorker(_, label) {
      const getWorkerModule = (url, options) =>
        new Worker(new URL(url, import.meta.url), { type: "module", ...options });

      switch (label) {
        case "json":
          return getWorkerModule(
            "monaco-editor/esm/vs/language/json/json.worker?worker",
            { name: label }
          );
        case "css":
        case "scss":
        case "less":
          return getWorkerModule(
            "monaco-editor/esm/vs/language/css/css.worker?worker",
            { name: label }
          );
        case "html":
        case "handlebars":
        case "razor":
          return getWorkerModule(
            "monaco-editor/esm/vs/language/html/html.worker?worker",
            { name: label }
          );
        case "typescript":
        case "javascript":
          return getWorkerModule(
            "monaco-editor/esm/vs/language/typescript/ts.worker?worker",
            { name: label }
          );
        default:
          return getWorkerModule(
            "monaco-editor/esm/vs/editor/editor.worker?worker",
            { name: label }
          );
      }
    },
  };
}

// ── TypeScript/JavaScript Compiler Defaults ────────────────────────────
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  allowNonTsExtensions: true,
  allowJs: true,
  checkJs: true,
  jsx: monaco.languages.typescript.JsxEmit.React,
  strict: false,
  noEmit: true,
});

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  allowNonTsExtensions: true,
  allowJs: true,
  checkJs: true,
  jsx: monaco.languages.typescript.JsxEmit.React,
  strict: false,
  noEmit: true,
});

// Eagerly fetch libs so TS worker starts warming up in the background.
monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

// ── Diagnostics configuration ──────────────────────────────────────────
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: false,
  noSyntaxValidation: false,
});
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: false,
  noSyntaxValidation: false,
});

// ── Default Editor Options ─────────────────────────────────────────────
export const DEFAULT_EDITOR_OPTIONS = {
  // Core editing
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace",
  fontLigatures: true,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: "off",
  lineNumbers: "on",
  renderWhitespace: "selection",
  
  // IntelliSense & Autocomplete
  suggestOnTriggerCharacters: true,
  quickSuggestions: { other: true, comments: false, strings: true },
  acceptSuggestionOnCommitCharacter: true,
  acceptSuggestionOnEnter: "on",
  tabCompletion: "on",
  wordBasedSuggestions: "currentDocument",
  suggestSelection: "first",
  snippetSuggestions: "top",
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showClasses: true,
    showFunctions: true,
    showVariables: true,
    showModules: true,
    showProperties: true,
    showMethods: true,
    showConstants: true,
    showInterfaces: true,
    showConstructors: true,
    showEvents: true,
    showOperators: true,
    showUnits: true,
    showValues: true,
    showColors: true,
    showFiles: true,
    showReferences: true,
    showTypeParameters: true,
    showEnumMembers: true,
    showIcons: true,
    filterGraceful: true,
    preview: true,
    showStatusBar: true,
    shareSuggestSelections: true,
    insertMode: "insert",
  },

  // Parameter hints
  parameterHints: { enabled: true, cycle: true },

  // Hover
  hover: { enabled: true, delay: 300 },

  // Bracket matching & guides
  bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
  guides: { bracketPairs: true, indentation: true, highlightActiveBracketPair: true },
  matchBrackets: "always",
  autoClosingBrackets: "always",
  autoClosingQuotes: "always",
  autoSurround: "languageDefined",

  // Auto indentation
  autoIndent: "full",
  formatOnPaste: false,
  formatOnType: false,

  // Minimap
  minimap: { enabled: true, maxColumn: 80, renderCharacters: false, showSlider: "mouseover" },

  // Scrollbar
  scrollbar: {
    useShadows: false,
    verticalHasArrows: false,
    horizontalHasArrows: false,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },

  // Visual
  smoothScrolling: true,
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  cursorStyle: "line",
  renderLineHighlight: "all",
  renderLineHighlightOnlyWhenFocus: false,
  colorDecorators: true,
  linkedEditing: true,
  
  // Folding
  folding: true,
  foldingStrategy: "indentation",
  showFoldingControls: "mouseover",

  // Sticky scroll (VS Code feature)
  stickyScroll: { enabled: true },

  // Inlay hints
  inlayHints: { enabled: "on" },

  // Misc
  automaticLayout: true,
  padding: { top: 8, bottom: 8 },
  overviewRulerBorder: false,
  scrollBeyondLastLine: false,
  fixedOverflowWidgets: true,
};

export { monaco };
