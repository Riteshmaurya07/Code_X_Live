/**
 * snippetLibrary.js — Comprehensive code snippet library for all supported languages.
 * Each snippet is a Monaco CompletionItem with insertTextRules for snippet syntax.
 */
import { monaco } from "./monacoSetup";

const Snippet = monaco.languages.CompletionItemKind.Snippet;
const SnippetRule = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

const s = (label, insertText, detail, doc) => ({
  label, kind: Snippet, insertText, detail,
  insertTextRules: SnippetRule,
  documentation: { value: doc || detail },
});

// ── JavaScript / TypeScript / Node.js ─────────────────────────────────
const jsSnippets = [
  s("log", "console.log(${1:message});", "Console Log", "Log output to console"),
  s("func", "function ${1:name}(${2:params}) {\n\t${3:// body}\n}", "Function Declaration"),
  s("afunc", "async function ${1:name}(${2:params}) {\n\t${3:// body}\n}", "Async Function"),
  s("arrow", "const ${1:name} = (${2:params}) => {\n\t${3:// body}\n};", "Arrow Function"),
  s("aarrow", "const ${1:name} = async (${2:params}) => {\n\t${3:// body}\n};", "Async Arrow Function"),
  s("iife", "(function() {\n\t${1:// body}\n})();", "IIFE"),
  s("if", "if (${1:condition}) {\n\t${2:// body}\n}", "If Statement"),
  s("ifelse", "if (${1:condition}) {\n\t${2:// then}\n} else {\n\t${3:// else}\n}", "If-Else"),
  s("ternary", "${1:condition} ? ${2:then} : ${3:else}", "Ternary Operator"),
  s("for", "for (let ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:// body}\n}", "For Loop"),
  s("forof", "for (const ${1:item} of ${2:iterable}) {\n\t${3:// body}\n}", "For...of Loop"),
  s("forin", "for (const ${1:key} in ${2:object}) {\n\t${3:// body}\n}", "For...in Loop"),
  s("while", "while (${1:condition}) {\n\t${2:// body}\n}", "While Loop"),
  s("dowhile", "do {\n\t${1:// body}\n} while (${2:condition});", "Do-While Loop"),
  s("switch", "switch (${1:key}) {\n\tcase ${2:value}:\n\t\t${3:// case}\n\t\tbreak;\n\tdefault:\n\t\t${4:// default}\n\t\tbreak;\n}", "Switch Statement"),
  s("trycatch", "try {\n\t${1:// try}\n} catch (${2:error}) {\n\t${3:// catch}\n}", "Try-Catch"),
  s("tryfinally", "try {\n\t${1:// try}\n} catch (${2:error}) {\n\t${3:// catch}\n} finally {\n\t${4:// finally}\n}", "Try-Catch-Finally"),
  s("class", "class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t${3:// constructor}\n\t}\n\n\t${4:method}() {\n\t\t${5:// method}\n\t}\n}", "Class Declaration"),
  s("classext", "class ${1:Name} extends ${2:Base} {\n\tconstructor(${3:params}) {\n\t\tsuper(${4:args});\n\t\t${5:// constructor}\n\t}\n}", "Class with Extends"),
  s("promise", "new Promise((resolve, reject) => {\n\t${1:// executor}\n})", "Promise"),
  s("then", ".then((${1:result}) => {\n\t${2:// success}\n}).catch((${3:error}) => {\n\t${4:// error}\n});", "Then-Catch"),
  s("map", "${1:array}.map((${2:item}) => {\n\t${3:return item}\n})", "Array Map"),
  s("filter", "${1:array}.filter((${2:item}) => {\n\t${3:return true}\n})", "Array Filter"),
  s("reduce", "${1:array}.reduce((${2:acc}, ${3:curr}) => {\n\t${4:return acc}\n}, ${5:initial})", "Array Reduce"),
  s("foreach", "${1:array}.forEach((${2:item}) => {\n\t${3:// body}\n});", "Array ForEach"),
  s("destructobj", "const { ${1:prop1}, ${2:prop2} } = ${3:object};", "Object Destructuring"),
  s("destructarr", "const [${1:first}, ${2:second}] = ${3:array};", "Array Destructuring"),
  s("import", "import ${1:module} from '${2:path}';", "Import"),
  s("importd", "import { ${1:name} } from '${2:path}';", "Named Import"),
  s("export", "export default ${1:name};", "Export Default"),
  s("exportn", "export { ${1:name} };", "Named Export"),
  s("setTimeout", "setTimeout(() => {\n\t${1:// body}\n}, ${2:1000});", "setTimeout"),
  s("setInterval", "setInterval(() => {\n\t${1:// body}\n}, ${2:1000});", "setInterval"),
  s("fetch", "const response = await fetch('${1:url}');\nconst data = await response.json();", "Fetch API"),
  s("eventListener", "${1:element}.addEventListener('${2:click}', (${3:event}) => {\n\t${4:// handler}\n});", "Event Listener"),
  // React-specific
  s("rfc", "import React from 'react';\n\nfunction ${1:Component}(${2:props}) {\n\treturn (\n\t\t<div>\n\t\t\t${3:content}\n\t\t</div>\n\t);\n}\n\nexport default ${1:Component};", "React Functional Component"),
  s("useState", "const [${1:state}, set${2:State}] = useState(${3:initialValue});", "React useState"),
  s("useEffect", "useEffect(() => {\n\t${1:// effect}\n\treturn () => {\n\t\t${2:// cleanup}\n\t};\n}, [${3:deps}]);", "React useEffect"),
  s("useRef", "const ${1:ref} = useRef(${2:null});", "React useRef"),
  s("useCallback", "const ${1:callback} = useCallback((${2:args}) => {\n\t${3:// body}\n}, [${4:deps}]);", "React useCallback"),
  s("useMemo", "const ${1:memoized} = useMemo(() => {\n\t${2:return value}\n}, [${3:deps}]);", "React useMemo"),
];

// ── Python ─────────────────────────────────────────────────────────────
const pythonSnippets = [
  s("def", "def ${1:function_name}(${2:params}):\n\t${3:pass}", "Function"),
  s("adef", "async def ${1:function_name}(${2:params}):\n\t${3:pass}", "Async Function"),
  s("class", "class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}\n\n\tdef ${4:method}(self):\n\t\t${5:pass}", "Class"),
  s("classi", "class ${1:ClassName}(${2:BaseClass}):\n\tdef __init__(self${3:, params}):\n\t\tsuper().__init__()\n\t\t${4:pass}", "Class with Inheritance"),
  s("if", "if ${1:condition}:\n\t${2:pass}", "If"),
  s("ifelse", "if ${1:condition}:\n\t${2:pass}\nelse:\n\t${3:pass}", "If-Else"),
  s("elif", "elif ${1:condition}:\n\t${2:pass}", "Elif"),
  s("for", "for ${1:item} in ${2:iterable}:\n\t${3:pass}", "For Loop"),
  s("while", "while ${1:condition}:\n\t${2:pass}", "While Loop"),
  s("with", "with ${1:expression} as ${2:var}:\n\t${3:pass}", "With Statement"),
  s("try", "try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}", "Try-Except"),
  s("tryf", "try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}\nfinally:\n\t${5:pass}", "Try-Except-Finally"),
  s("lc", "[${1:expr} for ${2:item} in ${3:iterable}]", "List Comprehension"),
  s("dc", "{${1:key}: ${2:val} for ${3:item} in ${4:iterable}}", "Dict Comprehension"),
  s("lambda", "lambda ${1:args}: ${2:expression}", "Lambda"),
  s("main", 'if __name__ == "__main__":\n\t${1:main()}', "Main Guard"),
  s("print", "print(${1:message})", "Print"),
  s("fstring", 'f"${1:text} {${2:var}}"', "F-String"),
  s("decorator", "def ${1:decorator}(func):\n\tdef wrapper(*args, **kwargs):\n\t\t${2:# before}\n\t\tresult = func(*args, **kwargs)\n\t\t${3:# after}\n\t\treturn result\n\treturn wrapper", "Decorator"),
];

// ── Java ───────────────────────────────────────────────────────────────
const javaSnippets = [
  s("main", "public static void main(String[] args) {\n\t${1:// main}\n}", "Main Method"),
  s("sout", "System.out.println(${1:message});", "Print Line"),
  s("class", "public class ${1:ClassName} {\n\t${2:// body}\n}", "Class"),
  s("classext", "public class ${1:ClassName} extends ${2:BaseClass} {\n\t${3:// body}\n}", "Class Extends"),
  s("interface", "public interface ${1:Name} {\n\t${2:// methods}\n}", "Interface"),
  s("method", "public ${1:void} ${2:methodName}(${3:params}) {\n\t${4:// body}\n}", "Method"),
  s("for", "for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t${3:// body}\n}", "For Loop"),
  s("foreach", "for (${1:Type} ${2:item} : ${3:collection}) {\n\t${4:// body}\n}", "For-Each"),
  s("if", "if (${1:condition}) {\n\t${2:// body}\n}", "If"),
  s("ifelse", "if (${1:condition}) {\n\t${2:// then}\n} else {\n\t${3:// else}\n}", "If-Else"),
  s("trycatch", "try {\n\t${1:// try}\n} catch (${2:Exception} ${3:e}) {\n\t${4:// catch}\n}", "Try-Catch"),
  s("switch", "switch (${1:key}) {\n\tcase ${2:value}:\n\t\t${3:// case}\n\t\tbreak;\n\tdefault:\n\t\t${4:// default}\n}", "Switch"),
];

// ── C / C++ ────────────────────────────────────────────────────────────
const cppSnippets = [
  s("include", "#include <${1:iostream}>", "Include"),
  s("main", "int main(int argc, char *argv[]) {\n\t${1:// main}\n\treturn 0;\n}", "Main Function"),
  s("cout", "std::cout << ${1:message} << std::endl;", "Cout"),
  s("cin", "std::cin >> ${1:variable};", "Cin"),
  s("for", "for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3:// body}\n}", "For Loop"),
  s("while", "while (${1:condition}) {\n\t${2:// body}\n}", "While Loop"),
  s("if", "if (${1:condition}) {\n\t${2:// body}\n}", "If"),
  s("ifelse", "if (${1:condition}) {\n\t${2:// then}\n} else {\n\t${3:// else}\n}", "If-Else"),
  s("class", "class ${1:Name} {\npublic:\n\t${1:Name}();\n\t~${1:Name}();\nprivate:\n\t${2:// members}\n};", "Class"),
  s("struct", "struct ${1:Name} {\n\t${2:// members}\n};", "Struct"),
  s("func", "${1:void} ${2:functionName}(${3:params}) {\n\t${4:// body}\n}", "Function"),
  s("switch", "switch (${1:key}) {\n\tcase ${2:value}:\n\t\t${3:// case}\n\t\tbreak;\n\tdefault:\n\t\t${4:// default}\n\t\tbreak;\n}", "Switch"),
  s("trycatch", "try {\n\t${1:// try}\n} catch (${2:const std::exception&} ${3:e}) {\n\t${4:// catch}\n}", "Try-Catch"),
  s("printf", 'printf("${1:%s}\\n", ${2:var});', "Printf"),
  s("scanf", 'scanf("${1:%d}", &${2:var});', "Scanf"),
];

// ── HTML ───────────────────────────────────────────────────────────────
const htmlSnippets = [
  s("html5", '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${2:content}\n</body>\n</html>', "HTML5 Boilerplate"),
  s("div", "<div${1: class=\"${2:name}\"}>\n\t${3:content}\n</div>", "Div"),
  s("a", '<a href="${1:url}">${2:text}</a>', "Anchor"),
  s("img", '<img src="${1:src}" alt="${2:alt}"${3: /}>', "Image"),
  s("link", '<link rel="stylesheet" href="${1:style.css}">', "CSS Link"),
  s("script", '<script src="${1:script.js}"></script>', "Script"),
  s("ul", "<ul>\n\t<li>${1:item}</li>\n</ul>", "Unordered List"),
  s("form", '<form action="${1:url}" method="${2:post}">\n\t${3:fields}\n</form>', "Form"),
  s("input", '<input type="${1:text}" name="${2:name}" id="${3:id}"${4: /}>', "Input"),
  s("button", '<button type="${1:button}">${2:Click}</button>', "Button"),
];

// ── CSS ────────────────────────────────────────────────────────────────
const cssSnippets = [
  s("flex", "display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};", "Flexbox Center"),
  s("grid", "display: grid;\ngrid-template-columns: ${1:1fr 1fr};\ngap: ${2:1rem};", "Grid Layout"),
  s("media", "@media (max-width: ${1:768px}) {\n\t${2:/* styles */}\n}", "Media Query"),
  s("var", "--${1:name}: ${2:value};", "CSS Variable"),
  s("transition", "transition: ${1:all} ${2:0.3s} ${3:ease};", "Transition"),
  s("animation", "@keyframes ${1:name} {\n\tfrom { ${2:/* start */} }\n\tto { ${3:/* end */} }\n}", "Keyframes"),
  s("center", "position: absolute;\ntop: 50%;\nleft: 50%;\ntransform: translate(-50%, -50%);", "Absolute Center"),
  s("reset", "* {\n\tmargin: 0;\n\tpadding: 0;\n\tbox-sizing: border-box;\n}", "CSS Reset"),
];

// ── Language → Snippet map ─────────────────────────────────────────────
export const SNIPPET_MAP = {
  javascript: jsSnippets,
  typescript: jsSnippets,
  python: pythonSnippets,
  java: javaSnippets,
  cpp: cppSnippets,
  c: cppSnippets,
  csharp: javaSnippets,
  html: htmlSnippets,
  css: cssSnippets,
  scss: cssSnippets,
  // Go, Rust, Ruby, etc. get basic snippets from the JS set (control flow is similar)
  go: [
    s("func", "func ${1:name}(${2:params}) ${3:returnType} {\n\t${4:// body}\n}", "Function"),
    s("main", 'package main\n\nimport "fmt"\n\nfunc main() {\n\t${1:fmt.Println("Hello")}\n}', "Main"),
    s("if", "if ${1:condition} {\n\t${2:// body}\n}", "If"),
    s("for", "for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t${3:// body}\n}", "For"),
    s("forrange", "for ${1:i}, ${2:v} := range ${3:collection} {\n\t${4:// body}\n}", "For Range"),
    s("struct", "type ${1:Name} struct {\n\t${2:Field} ${3:Type}\n}", "Struct"),
    s("interface", "type ${1:Name} interface {\n\t${2:Method}() ${3:Type}\n}", "Interface"),
  ],
  rust: [
    s("fn", "fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t${4:// body}\n}", "Function"),
    s("main", 'fn main() {\n\t${1:println!("Hello, world!");}\n}', "Main"),
    s("struct", "struct ${1:Name} {\n\t${2:field}: ${3:Type},\n}", "Struct"),
    s("impl", "impl ${1:Name} {\n\t${2:// methods}\n}", "Impl"),
    s("match", "match ${1:value} {\n\t${2:pattern} => ${3:result},\n\t_ => ${4:default},\n}", "Match"),
    s("let", "let ${1:name}: ${2:Type} = ${3:value};", "Let binding"),
  ],
  ruby: [
    s("def", "def ${1:method_name}(${2:params})\n\t${3:# body}\nend", "Method"),
    s("class", "class ${1:ClassName}\n\tdef initialize(${2:params})\n\t\t${3:# init}\n\tend\nend", "Class"),
    s("if", "if ${1:condition}\n\t${2:# body}\nend", "If"),
    s("each", "${1:collection}.each do |${2:item}|\n\t${3:# body}\nend", "Each"),
    s("puts", "puts ${1:message}", "Puts"),
  ],
  php: [
    s("php", "<?php\n${1:// code}\n?>", "PHP Tags"),
    s("func", "function ${1:name}(${2:params}) {\n\t${3:// body}\n}", "Function"),
    s("class", "class ${1:Name} {\n\tpublic function __construct(${2:params}) {\n\t\t${3:// init}\n\t}\n}", "Class"),
    s("echo", "echo ${1:message};", "Echo"),
    s("foreach", "foreach ($$${1:array} as $$${2:key} => $$${3:value}) {\n\t${4:// body}\n}", "Foreach"),
  ],
};

export default SNIPPET_MAP;
