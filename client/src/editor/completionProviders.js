/**
 * completionProviders.js — Rich IntelliSense completion providers for Monaco.
 *
 * Registers language-specific completion providers that offer:
 * - Keywords, built-in functions, methods
 * - Snippets from snippetLibrary.js
 * - Context-aware suggestions
 * - Import suggestions
 */
import { monaco } from "./monacoSetup";
import { SNIPPET_MAP } from "./snippetLibrary";

const CompletionKind = monaco.languages.CompletionItemKind;

// ── Built-in completions per language ──────────────────────────────────

const JS_BUILTINS = [
  // Global objects
  { label: "console", kind: CompletionKind.Module, detail: "Console API", insertText: "console" },
  { label: "console.log", kind: CompletionKind.Function, detail: "Log to console", insertText: "console.log(${1:message})", insertTextRules: 4 },
  { label: "console.error", kind: CompletionKind.Function, detail: "Log error", insertText: "console.error(${1:message})", insertTextRules: 4 },
  { label: "console.warn", kind: CompletionKind.Function, detail: "Log warning", insertText: "console.warn(${1:message})", insertTextRules: 4 },
  { label: "console.table", kind: CompletionKind.Function, detail: "Display as table", insertText: "console.table(${1:data})", insertTextRules: 4 },
  { label: "JSON.stringify", kind: CompletionKind.Function, detail: "Convert to JSON string", insertText: "JSON.stringify(${1:value}, null, ${2:2})", insertTextRules: 4 },
  { label: "JSON.parse", kind: CompletionKind.Function, detail: "Parse JSON string", insertText: "JSON.parse(${1:text})", insertTextRules: 4 },
  { label: "Math.random", kind: CompletionKind.Function, detail: "Random number [0,1)", insertText: "Math.random()" },
  { label: "Math.floor", kind: CompletionKind.Function, detail: "Round down", insertText: "Math.floor(${1:x})", insertTextRules: 4 },
  { label: "Math.ceil", kind: CompletionKind.Function, detail: "Round up", insertText: "Math.ceil(${1:x})", insertTextRules: 4 },
  { label: "Math.max", kind: CompletionKind.Function, detail: "Maximum value", insertText: "Math.max(${1:a}, ${2:b})", insertTextRules: 4 },
  { label: "Math.min", kind: CompletionKind.Function, detail: "Minimum value", insertText: "Math.min(${1:a}, ${2:b})", insertTextRules: 4 },
  { label: "parseInt", kind: CompletionKind.Function, detail: "Parse string to integer", insertText: "parseInt(${1:string}, ${2:10})", insertTextRules: 4 },
  { label: "parseFloat", kind: CompletionKind.Function, detail: "Parse string to float", insertText: "parseFloat(${1:string})", insertTextRules: 4 },
  { label: "Array.isArray", kind: CompletionKind.Function, detail: "Check if array", insertText: "Array.isArray(${1:value})", insertTextRules: 4 },
  { label: "Object.keys", kind: CompletionKind.Function, detail: "Get object keys", insertText: "Object.keys(${1:obj})", insertTextRules: 4 },
  { label: "Object.values", kind: CompletionKind.Function, detail: "Get object values", insertText: "Object.values(${1:obj})", insertTextRules: 4 },
  { label: "Object.entries", kind: CompletionKind.Function, detail: "Get [key, value] pairs", insertText: "Object.entries(${1:obj})", insertTextRules: 4 },
  { label: "Promise.all", kind: CompletionKind.Function, detail: "Await all promises", insertText: "Promise.all([${1:promises}])", insertTextRules: 4 },
  { label: "Promise.resolve", kind: CompletionKind.Function, detail: "Resolved promise", insertText: "Promise.resolve(${1:value})", insertTextRules: 4 },
  { label: "setTimeout", kind: CompletionKind.Function, detail: "Delay execution", insertText: "setTimeout(() => {\n\t${1:// body}\n}, ${2:1000})", insertTextRules: 4 },
  { label: "setInterval", kind: CompletionKind.Function, detail: "Repeat execution", insertText: "setInterval(() => {\n\t${1:// body}\n}, ${2:1000})", insertTextRules: 4 },
  // Node.js
  { label: "require", kind: CompletionKind.Function, detail: "CommonJS import", insertText: "const ${1:module} = require('${2:path}');", insertTextRules: 4 },
  { label: "module.exports", kind: CompletionKind.Property, detail: "CommonJS export", insertText: "module.exports = ${1:value};", insertTextRules: 4 },
  { label: "process.env", kind: CompletionKind.Property, detail: "Environment variables", insertText: "process.env.${1:VAR}" , insertTextRules: 4 },
];

const PYTHON_BUILTINS = [
  { label: "print", kind: CompletionKind.Function, detail: "Print to stdout", insertText: "print(${1:message})", insertTextRules: 4 },
  { label: "len", kind: CompletionKind.Function, detail: "Length of collection", insertText: "len(${1:obj})", insertTextRules: 4 },
  { label: "range", kind: CompletionKind.Function, detail: "Generate range", insertText: "range(${1:start}, ${2:stop})", insertTextRules: 4 },
  { label: "enumerate", kind: CompletionKind.Function, detail: "Enumerate iterable", insertText: "enumerate(${1:iterable})", insertTextRules: 4 },
  { label: "zip", kind: CompletionKind.Function, detail: "Zip iterables", insertText: "zip(${1:iter1}, ${2:iter2})", insertTextRules: 4 },
  { label: "map", kind: CompletionKind.Function, detail: "Map function", insertText: "map(${1:func}, ${2:iterable})", insertTextRules: 4 },
  { label: "filter", kind: CompletionKind.Function, detail: "Filter iterable", insertText: "filter(${1:func}, ${2:iterable})", insertTextRules: 4 },
  { label: "sorted", kind: CompletionKind.Function, detail: "Sort iterable", insertText: "sorted(${1:iterable})", insertTextRules: 4 },
  { label: "isinstance", kind: CompletionKind.Function, detail: "Type check", insertText: "isinstance(${1:obj}, ${2:type})", insertTextRules: 4 },
  { label: "type", kind: CompletionKind.Function, detail: "Get type", insertText: "type(${1:obj})", insertTextRules: 4 },
  { label: "str", kind: CompletionKind.Function, detail: "Convert to string", insertText: "str(${1:obj})", insertTextRules: 4 },
  { label: "int", kind: CompletionKind.Function, detail: "Convert to int", insertText: "int(${1:obj})", insertTextRules: 4 },
  { label: "float", kind: CompletionKind.Function, detail: "Convert to float", insertText: "float(${1:obj})", insertTextRules: 4 },
  { label: "list", kind: CompletionKind.Function, detail: "Convert to list", insertText: "list(${1:iterable})", insertTextRules: 4 },
  { label: "dict", kind: CompletionKind.Function, detail: "Create dictionary", insertText: "dict(${1:})", insertTextRules: 4 },
  { label: "set", kind: CompletionKind.Function, detail: "Create set", insertText: "set(${1:iterable})", insertTextRules: 4 },
  { label: "tuple", kind: CompletionKind.Function, detail: "Create tuple", insertText: "tuple(${1:iterable})", insertTextRules: 4 },
  { label: "input", kind: CompletionKind.Function, detail: "Read user input", insertText: "input(${1:prompt})", insertTextRules: 4 },
  { label: "open", kind: CompletionKind.Function, detail: "Open file", insertText: "open('${1:filename}', '${2:r}')", insertTextRules: 4 },
  { label: "import", kind: CompletionKind.Keyword, detail: "Import module", insertText: "import ${1:module}", insertTextRules: 4 },
  { label: "from", kind: CompletionKind.Keyword, detail: "From import", insertText: "from ${1:module} import ${2:name}", insertTextRules: 4 },
];

const JAVA_BUILTINS = [
  { label: "System.out.println", kind: CompletionKind.Function, detail: "Print line", insertText: "System.out.println(${1:message});", insertTextRules: 4 },
  { label: "System.out.print", kind: CompletionKind.Function, detail: "Print", insertText: "System.out.print(${1:message});", insertTextRules: 4 },
  { label: "String.format", kind: CompletionKind.Function, detail: "Format string", insertText: 'String.format("${1:%s}", ${2:args})', insertTextRules: 4 },
  { label: "Arrays.sort", kind: CompletionKind.Function, detail: "Sort array", insertText: "Arrays.sort(${1:array});", insertTextRules: 4 },
  { label: "Collections.sort", kind: CompletionKind.Function, detail: "Sort collection", insertText: "Collections.sort(${1:list});", insertTextRules: 4 },
  { label: "new ArrayList<>", kind: CompletionKind.Constructor, detail: "New ArrayList", insertText: "new ArrayList<${1:Type}>()", insertTextRules: 4 },
  { label: "new HashMap<>", kind: CompletionKind.Constructor, detail: "New HashMap", insertText: "new HashMap<${1:Key}, ${2:Value}>()", insertTextRules: 4 },
];

const CPP_BUILTINS = [
  { label: "std::cout", kind: CompletionKind.Function, detail: "Standard output", insertText: "std::cout << ${1:message} << std::endl;", insertTextRules: 4 },
  { label: "std::cin", kind: CompletionKind.Function, detail: "Standard input", insertText: "std::cin >> ${1:variable};", insertTextRules: 4 },
  { label: "std::vector", kind: CompletionKind.Class, detail: "Dynamic array", insertText: "std::vector<${1:int}> ${2:vec};", insertTextRules: 4 },
  { label: "std::string", kind: CompletionKind.Class, detail: "String", insertText: "std::string ${1:str}", insertTextRules: 4 },
  { label: "std::map", kind: CompletionKind.Class, detail: "Ordered map", insertText: "std::map<${1:Key}, ${2:Value}> ${3:map};", insertTextRules: 4 },
  { label: "std::sort", kind: CompletionKind.Function, detail: "Sort range", insertText: "std::sort(${1:begin}, ${2:end});", insertTextRules: 4 },
  { label: "printf", kind: CompletionKind.Function, detail: "Formatted print", insertText: 'printf("${1:%s}\\n", ${2:var});', insertTextRules: 4 },
  { label: "scanf", kind: CompletionKind.Function, detail: "Formatted scan", insertText: 'scanf("${1:%d}", &${2:var});', insertTextRules: 4 },
];

const BUILTIN_MAP = {
  javascript: JS_BUILTINS,
  typescript: JS_BUILTINS,
  python:     PYTHON_BUILTINS,
  java:       JAVA_BUILTINS,
  cpp:        CPP_BUILTINS,
  c:          CPP_BUILTINS,
  csharp:     JAVA_BUILTINS,
};

// ── Disposable tracking ────────────────────────────────────────────────
const disposables = [];

/**
 * Register all completion providers for all supported languages.
 */
export const registerCompletionProviders = () => {
  const languages = [
    "javascript", "typescript", "python", "java",
    "cpp", "c", "csharp", "go", "rust", "ruby",
    "php", "swift", "r", "shell", "sql", "scala",
    "html", "css", "json",
  ];

  for (const lang of languages) {
    const d = monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: [".", "(", "'", '"', "<", "/", "@", "{", " "],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [];
        let sortPriority = 0;

        // 1. Snippets (highest priority)
        const snippets = SNIPPET_MAP[lang] || [];
        for (const snip of snippets) {
          suggestions.push({
            ...snip,
            range,
            sortText: `0${String(sortPriority++).padStart(4, "0")}`,
          });
        }

        // 2. Built-in completions
        const builtins = BUILTIN_MAP[lang] || [];
        for (const bi of builtins) {
          suggestions.push({
            ...bi,
            range,
            sortText: `1${String(sortPriority++).padStart(4, "0")}`,
          });
        }

        // 3. Extract identifiers from current document for word-based completions
        const content = model.getValue();
        const identifierPattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
        const seen = new Set(suggestions.map(s => s.label));
        let match;
        while ((match = identifierPattern.exec(content)) !== null) {
          const id = match[0];
          if (id.length < 2 || seen.has(id)) continue;
          seen.add(id);
          suggestions.push({
            label: id,
            kind: CompletionKind.Variable,
            detail: "Document word",
            insertText: id,
            range,
            sortText: `2${String(sortPriority++).padStart(4, "0")}`,
          });
        }

        return { suggestions };
      },
    });
    disposables.push(d);
  }
};

/**
 * Dispose all registered providers (for cleanup).
 */
export const disposeCompletionProviders = () => {
  for (const d of disposables) d.dispose();
  disposables.length = 0;
};
