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

const GO_BUILTINS = [
  { label: "fmt.Println", kind: CompletionKind.Function, detail: "Print with newline", insertText: "fmt.Println(${1:message})", insertTextRules: 4 },
  { label: "fmt.Printf", kind: CompletionKind.Function, detail: "Formatted print", insertText: "fmt.Printf(\"${1:%s}\\n\", ${2:var})", insertTextRules: 4 },
  { label: "fmt.Sprintf", kind: CompletionKind.Function, detail: "Format to string", insertText: "fmt.Sprintf(\"${1:%s}\", ${2:var})", insertTextRules: 4 },
  { label: "append", kind: CompletionKind.Function, detail: "Append to slice", insertText: "append(${1:slice}, ${2:value})", insertTextRules: 4 },
  { label: "make", kind: CompletionKind.Function, detail: "Initialize slice/map/chan", insertText: "make(${1:Type}, ${2:size})", insertTextRules: 4 },
  { label: "len", kind: CompletionKind.Function, detail: "Length of collection", insertText: "len(${1:v})", insertTextRules: 4 },
  { label: "panic", kind: CompletionKind.Function, detail: "Raise panic", insertText: "panic(${1:err})", insertTextRules: 4 },
  { label: "recover", kind: CompletionKind.Function, detail: "Recover from panic", insertText: "recover()" },
];

const RUST_BUILTINS = [
  { label: "println!", kind: CompletionKind.Function, detail: "Print line to stdout", insertText: "println!(\"${1:{}}\", ${2:var});", insertTextRules: 4 },
  { label: "print!", kind: CompletionKind.Function, detail: "Print to stdout", insertText: "print!(\"${1:{}}\", ${2:var});", insertTextRules: 4 },
  { label: "format!", kind: CompletionKind.Function, detail: "Format to String", insertText: "format!(\"${1:{}}\", ${2:var})", insertTextRules: 4 },
  { label: "vec!", kind: CompletionKind.Function, detail: "Create vector slice", insertText: "vec![${1:elements}]", insertTextRules: 4 },
  { label: "Option::Some", kind: CompletionKind.EnumMember, detail: "Option wrapper", insertText: "Some(${1:val})", insertTextRules: 4 },
  { label: "Option::None", kind: CompletionKind.EnumMember, detail: "Option empty", insertText: "None" },
  { label: "Result::Ok", kind: CompletionKind.EnumMember, detail: "Result success", insertText: "Ok(${1:val})", insertTextRules: 4 },
  { label: "Result::Err", kind: CompletionKind.EnumMember, detail: "Result error", insertText: "Err(${1:err})", insertTextRules: 4 },
];

const SQL_BUILTINS = [
  { label: "SELECT", kind: CompletionKind.Keyword, detail: "SQL Keyword", insertText: "SELECT ${1:columns} FROM ${2:table}", insertTextRules: 4 },
  { label: "INSERT INTO", kind: CompletionKind.Keyword, detail: "SQL Keyword", insertText: "INSERT INTO ${1:table} (${2:columns}) VALUES (${3:values})", insertTextRules: 4 },
  { label: "UPDATE", kind: CompletionKind.Keyword, detail: "SQL Keyword", insertText: "UPDATE ${1:table} SET ${2:column} = ${3:value} WHERE ${4:condition}", insertTextRules: 4 },
  { label: "DELETE FROM", kind: CompletionKind.Keyword, detail: "SQL Keyword", insertText: "DELETE FROM ${1:table} WHERE ${2:condition}", insertTextRules: 4 },
  { label: "WHERE", kind: CompletionKind.Keyword, detail: "SQL Keyword", insertText: "WHERE " },
  { label: "JOIN", kind: CompletionKind.Keyword, detail: "SQL Keyword", insertText: "JOIN ${1:table} ON ${2:condition}", insertTextRules: 4 },
  { label: "ORDER BY", kind: CompletionKind.Keyword, detail: "SQL Keyword", insertText: "ORDER BY ${1:column} ${2:ASC}", insertTextRules: 4 },
  { label: "GROUP BY", kind: CompletionKind.Keyword, detail: "SQL Keyword", insertText: "GROUP BY ${1:column}", insertTextRules: 4 },
];

const HTML_BUILTINS = [
  { label: "div", kind: CompletionKind.Class, detail: "HTML Element", insertText: "div" },
  { label: "span", kind: CompletionKind.Class, detail: "HTML Element", insertText: "span" },
  { label: "a", kind: CompletionKind.Class, detail: "HTML Element", insertText: "a" },
  { label: "img", kind: CompletionKind.Class, detail: "HTML Element", insertText: "img" },
  { label: "input", kind: CompletionKind.Class, detail: "HTML Element", insertText: "input" },
  { label: "button", kind: CompletionKind.Class, detail: "HTML Element", insertText: "button" },
  { label: "p", kind: CompletionKind.Class, detail: "HTML Element", insertText: "p" },
  { label: "script", kind: CompletionKind.Class, detail: "HTML Element", insertText: "script" },
  { label: "style", kind: CompletionKind.Class, detail: "HTML Element", insertText: "style" },
];

const CSS_BUILTINS = [
  { label: "display: flex", kind: CompletionKind.Property, detail: "CSS Layout", insertText: "display: flex;" },
  { label: "display: grid", kind: CompletionKind.Property, detail: "CSS Layout", insertText: "display: grid;" },
  { label: "position: absolute", kind: CompletionKind.Property, detail: "CSS Position", insertText: "position: absolute;" },
  { label: "position: relative", kind: CompletionKind.Property, detail: "CSS Position", insertText: "position: relative;" },
  { label: "margin", kind: CompletionKind.Property, detail: "CSS Margin", insertText: "margin: ${1:0};", insertTextRules: 4 },
  { label: "padding", kind: CompletionKind.Property, detail: "CSS Padding", insertText: "padding: ${1:0};", insertTextRules: 4 },
  { label: "background", kind: CompletionKind.Property, detail: "CSS Background", insertText: "background: ${1:color};", insertTextRules: 4 },
  { label: "color", kind: CompletionKind.Property, detail: "CSS Text Color", insertText: "color: ${1:color};", insertTextRules: 4 },
  { label: "font-size", kind: CompletionKind.Property, detail: "CSS Font Size", insertText: "font-size: ${1:16px};", insertTextRules: 4 },
];

const PHP_BUILTINS = [
  { label: "echo", kind: CompletionKind.Function, detail: "Output text", insertText: "echo ${1:message};", insertTextRules: 4 },
  { label: "var_dump", kind: CompletionKind.Function, detail: "Dump variable details", insertText: "var_dump(${1:var});", insertTextRules: 4 },
  { label: "isset", kind: CompletionKind.Function, detail: "Check if set", insertText: "isset(${1:var})", insertTextRules: 4 },
  { label: "empty", kind: CompletionKind.Function, detail: "Check if empty", insertText: "empty(${1:var})", insertTextRules: 4 },
  { label: "count", kind: CompletionKind.Function, detail: "Get element count", insertText: "count(${1:array})", insertTextRules: 4 },
  { label: "array", kind: CompletionKind.Function, detail: "Create array", insertText: "array(${1:})", insertTextRules: 4 },
];

const SHELL_BUILTINS = [
  { label: "echo", kind: CompletionKind.Function, detail: "Print string", insertText: "echo \"${1:message}\"", insertTextRules: 4 },
  { label: "export", kind: CompletionKind.Keyword, detail: "Set env var", insertText: "export ${1:VAR}=\"${2:value}\"", insertTextRules: 4 },
  { label: "if", kind: CompletionKind.Keyword, detail: "Conditional statement", insertText: "if [ ${1:condition} ]; then\n\t${2:# body}\nfi", insertTextRules: 4 },
  { label: "for", kind: CompletionKind.Keyword, detail: "For loop", insertText: "for ${1:var} in ${2:list}; do\n\t${3:# body}\ndone", insertTextRules: 4 },
  { label: "while", kind: CompletionKind.Keyword, detail: "While loop", insertText: "while [ ${1:condition} ]; do\n\t${2:# body}\ndone", insertTextRules: 4 },
];

const BUILTIN_MAP = {
  javascript: JS_BUILTINS,
  typescript: JS_BUILTINS,
  python:     PYTHON_BUILTINS,
  java:       JAVA_BUILTINS,
  cpp:        CPP_BUILTINS,
  c:          CPP_BUILTINS,
  csharp:     JAVA_BUILTINS,
  go:         GO_BUILTINS,
  rust:       RUST_BUILTINS,
  sql:        SQL_BUILTINS,
  html:       HTML_BUILTINS,
  css:        CSS_BUILTINS,
  php:        PHP_BUILTINS,
  shell:      SHELL_BUILTINS,
};

// ── Disposable tracking ────────────────────────────────────────────────
const disposables = [];

// ── Helper functions for dynamic prefix replacement ──────────────────────
function extractPlainText(insertText) {
  if (!insertText) return "";
  let text = insertText.replace(/\$\{\d+:([^\}]+)\}/g, '$1');
  text = text.replace(/\$\{\d+\}/g, '');
  text = text.replace(/\$\d+/g, '');
  return text;
}

function getOverlap(prefix, plainText) {
  if (!prefix || !plainText) return 0;
  
  // Standard exact match first (very fast)
  const maxOverlap = Math.min(prefix.length, plainText.length);
  for (let i = maxOverlap; i > 0; i--) {
    if (prefix.substring(prefix.length - i) === plainText.substring(0, i)) {
      // Reject partial word overlaps to avoid eating characters accidentally
      const charBefore = prefix.length - i - 1 >= 0 ? prefix[prefix.length - i - 1] : null;
      if (charBefore && /[a-zA-Z0-9_]/.test(charBefore)) {
        continue;
      }
      return i;
    }
  }

  // If no exact match, try matching by ignoring whitespaces
  const cleanString = (str) => str.replace(/\s+/g, "");
  const cleanPlainText = cleanString(plainText);
  
  for (let i = prefix.length; i > 0; i--) {
    const suffix = prefix.substring(prefix.length - i);
    const cleanSuffix = cleanString(suffix);
    if (cleanSuffix && cleanPlainText.startsWith(cleanSuffix)) {
      // Reject partial word overlaps
      const charBefore = prefix.length - i - 1 >= 0 ? prefix[prefix.length - i - 1] : null;
      if (charBefore && /[a-zA-Z0-9_]/.test(charBefore)) {
        continue;
      }
      return i;
    }
  }

  return 0;
}

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
      triggerCharacters: [".", ":", "<", "$", "@", "#", "/"],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        const prefixBeforeWord = textBeforeCursor.substring(0, textBeforeCursor.length - word.word.length);

        const defaultRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [];
        let sortPriority = 0;

        const processSuggestion = (item, typePrefix) => {
          let range = { ...defaultRange };
          try {
            if (typeof item.insertText === 'string') {
              const plainText = extractPlainText(item.insertText);
              const overlap = getOverlap(prefixBeforeWord, plainText);
              if (overlap > 0) {
                // Ensure startColumn never goes below 1
                const newStart = word.startColumn - overlap;
                range.startColumn = Math.max(1, newStart);
              }
            }
          } catch (e) {
            console.error("Error processing suggestion:", e);
          }
          return {
            ...item,
            range,
            sortText: `${typePrefix}${String(sortPriority++).padStart(4, "0")}`,
          };
        };

        // 1. Snippets (highest priority)
        const snippets = SNIPPET_MAP[lang] || [];
        for (const snip of snippets) {
          suggestions.push(processSuggestion(snip, "0"));
        }

        // 2. Built-in completions
        const builtins = BUILTIN_MAP[lang] || [];
        for (const bi of builtins) {
          suggestions.push(processSuggestion(bi, "1"));
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
          suggestions.push(processSuggestion({
            label: id,
            kind: CompletionKind.Variable,
            detail: "Document word",
            insertText: id,
          }, "2"));
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
