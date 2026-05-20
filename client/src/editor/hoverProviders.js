/**
 * hoverProviders.js — Hover documentation providers for Monaco.
 */
import { monaco } from "./monacoSetup";

// ── Hover documentation databases ─────────────────────────────────────
const JS_DOCS = {
  "console": { description: "The `console` object provides access to the browser's debugging console.", signature: "console" },
  "log": { description: "Outputs a message to the console.", signature: "console.log(obj1 [, obj2, ..., objN])" },
  "error": { description: "Outputs an error message to the console.", signature: "console.error(obj1 [, obj2, ..., objN])" },
  "warn": { description: "Outputs a warning message.", signature: "console.warn(obj1 [, obj2, ..., objN])" },
  "parseInt": { description: "Parses a string and returns an integer.", signature: "parseInt(string, radix?)" },
  "parseFloat": { description: "Parses a string and returns a float.", signature: "parseFloat(string)" },
  "setTimeout": { description: "Sets a timer which executes a function after delay.", signature: "setTimeout(callback, delay?, ...args)" },
  "setInterval": { description: "Calls a function at specified intervals.", signature: "setInterval(callback, delay?, ...args)" },
  "clearTimeout": { description: "Cancels a timeout set with setTimeout().", signature: "clearTimeout(timeoutID)" },
  "clearInterval": { description: "Cancels an interval set with setInterval().", signature: "clearInterval(intervalID)" },
  "fetch": { description: "Starts the process of fetching a resource from the network.", signature: "fetch(input, init?): Promise<Response>" },
  "Promise": { description: "Represents the eventual completion or failure of an async operation.", signature: "new Promise(executor)" },
  "Map": { description: "Holds key-value pairs and remembers insertion order.", signature: "new Map([iterable])" },
  "Set": { description: "Stores unique values of any type.", signature: "new Set([iterable])" },
  "Array": { description: "Ordered collection of elements.", signature: "Array(length?) | Array(...elements)" },
  "Object": { description: "Base object constructor.", signature: "Object()" },
  "JSON": { description: "Contains methods for parsing and generating JSON.", signature: "JSON" },
  "Math": { description: "Built-in object with math constants and functions.", signature: "Math" },
  "Date": { description: "Represents a single moment in time.", signature: "new Date(value?)" },
  "RegExp": { description: "Regular expression pattern matching.", signature: "new RegExp(pattern, flags?)" },
  "String": { description: "Sequence of characters.", signature: "String(value?)" },
  "Number": { description: "Numeric value wrapper.", signature: "Number(value?)" },
  "Boolean": { description: "Logical value wrapper.", signature: "Boolean(value?)" },
  "Symbol": { description: "Unique and immutable primitive value.", signature: "Symbol(description?)" },
  "require": { description: "Node.js CommonJS module import.", signature: "require(id: string)" },
  "module": { description: "Reference to the current module in Node.js.", signature: "module" },
  "exports": { description: "Shorthand for module.exports.", signature: "exports" },
  "process": { description: "Provides information about the current Node.js process.", signature: "process" },
  "Buffer": { description: "Used for handling binary data in Node.js.", signature: "Buffer" },
  "__dirname": { description: "Directory name of the current module.", signature: "__dirname: string" },
  "__filename": { description: "File name of the current module.", signature: "__filename: string" },
};

const PYTHON_DOCS = {
  "print": { description: "Print objects to the text stream.", signature: "print(*objects, sep=' ', end='\\n', file=sys.stdout)" },
  "len": { description: "Return the number of items in a container.", signature: "len(s) -> int" },
  "range": { description: "Generate a sequence of numbers.", signature: "range(stop) | range(start, stop[, step])" },
  "input": { description: "Read a line from input.", signature: "input(prompt='') -> str" },
  "type": { description: "Return the type of an object.", signature: "type(object) -> type" },
  "isinstance": { description: "Check if object is instance of class.", signature: "isinstance(object, classinfo) -> bool" },
  "enumerate": { description: "Return an enumerate object.", signature: "enumerate(iterable, start=0)" },
  "zip": { description: "Aggregate elements from iterables.", signature: "zip(*iterables, strict=False)" },
  "map": { description: "Apply function to every item.", signature: "map(function, iterable, ...)" },
  "filter": { description: "Filter elements by function.", signature: "filter(function, iterable)" },
  "sorted": { description: "Return a new sorted list.", signature: "sorted(iterable, *, key=None, reverse=False)" },
  "reversed": { description: "Return a reversed iterator.", signature: "reversed(seq)" },
  "sum": { description: "Sum of items in iterable.", signature: "sum(iterable, /, start=0)" },
  "min": { description: "Return the smallest item.", signature: "min(iterable, *, key=None, default)" },
  "max": { description: "Return the largest item.", signature: "max(iterable, *, key=None, default)" },
  "abs": { description: "Return the absolute value.", signature: "abs(x)" },
  "round": { description: "Round a number.", signature: "round(number, ndigits=None)" },
  "str": { description: "Return a string version.", signature: "str(object='') -> str" },
  "int": { description: "Convert to integer.", signature: "int(x=0) | int(x, base=10)" },
  "float": { description: "Convert to float.", signature: "float(x=0)" },
  "bool": { description: "Convert to boolean.", signature: "bool(x=False)" },
  "list": { description: "Create a list.", signature: "list([iterable])" },
  "dict": { description: "Create a dictionary.", signature: "dict(**kwargs) | dict(mapping)" },
  "set": { description: "Create a set.", signature: "set([iterable])" },
  "tuple": { description: "Create a tuple.", signature: "tuple([iterable])" },
  "open": { description: "Open a file and return a file object.", signature: "open(file, mode='r', ...)" },
  "hasattr": { description: "Check if object has attribute.", signature: "hasattr(object, name) -> bool" },
  "getattr": { description: "Get attribute value.", signature: "getattr(object, name[, default])" },
  "setattr": { description: "Set attribute value.", signature: "setattr(object, name, value)" },
};

const DOCS_MAP = {
  javascript: JS_DOCS,
  typescript: JS_DOCS,
  python: PYTHON_DOCS,
};

const disposables = [];

/**
 * Register hover providers for all supported languages.
 */
export const registerHoverProviders = () => {
  const languages = [
    "javascript", "typescript", "python", "java", "cpp", "c",
    "csharp", "go", "rust", "ruby", "php", "html", "css", "json",
  ];

  for (const lang of languages) {
    const d = monaco.languages.registerHoverProvider(lang, {
      provideHover(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const docs = DOCS_MAP[lang];
        if (!docs) return null;

        const entry = docs[word.word];
        if (!entry) return null;

        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            { value: `**\`${entry.signature}\`**` },
            { value: entry.description },
          ],
        };
      },
    });
    disposables.push(d);
  }
};

export const disposeHoverProviders = () => {
  for (const d of disposables) d.dispose();
  disposables.length = 0;
};
