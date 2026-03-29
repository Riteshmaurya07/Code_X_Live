import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import CodeMirror from "codemirror";

import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/eclipse.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/python/python";
import "codemirror/mode/clike/clike";
import "codemirror/mode/ruby/ruby";
import "codemirror/mode/go/go";
import "codemirror/mode/rust/rust";
import "codemirror/mode/php/php";
import "codemirror/mode/swift/swift";
import "codemirror/mode/r/r";
import "codemirror/mode/shell/shell";
import "codemirror/mode/sql/sql";
import "codemirror/mode/pascal/pascal";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/javascript-hint";
import "codemirror/addon/hint/anyword-hint";
import "codemirror/addon/selection/active-line";

import { ACTIONS } from "../Actions";

const langModeMap = {
  javascript: { name: "javascript", json: true },
  nodejs: { name: "javascript", json: true },
  python3: { name: "python" },
  java: { name: "text/x-java" },
  cpp: { name: "text/x-c++src" },
  c: { name: "text/x-csrc" },
  csharp: { name: "text/x-csharp" },
  ruby: { name: "ruby" },
  go: { name: "go" },
  rust: { name: "rust" },
  php: { name: "php" },
  swift: { name: "swift" },
  r: { name: "r" },
  bash: { name: "shell" },
  sql: { name: "sql" },
  pascal: { name: "pascal" },
  scala: { name: "text/x-scala" },
};

const Editor = forwardRef(function Editor(
  { socket, roomId, onCodeChange, theme, language, initialValue },
  ref
) {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  const socketRef = useRef(socket);
  const roomIdRef = useRef(roomId);

  useImperativeHandle(ref, () => ({
    setValue: (val) => {
      if (editorRef.current) {
        editorRef.current.setValue(val);
      }
    },
    getValue: () => {
      return editorRef.current?.getValue() || "";
    },
  }));

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Initialize CodeMirror ONCE
  useEffect(() => {
    if (!textareaRef.current) return;

    const editor = CodeMirror.fromTextArea(textareaRef.current, {
      mode: { name: "javascript", json: true },
      theme: theme === "light" ? "eclipse" : "dracula",
      autoCloseTags: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      lineNumbers: true,
      styleActiveLine: true,
      extraKeys: {
        "Ctrl-Space": "autocomplete",
      },
    });

    editorRef.current = editor;
    editor.setSize("100%", "100%");

    if (initialValue) {
      editor.setValue(initialValue);
    }

    // Debounce timer for socket emissions
    let emitTimer = null;

    editor.on("change", (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();
      onCodeChange(code);

      const currentSocket = socketRef.current;
      const currentRoomId = roomIdRef.current;

      if (origin !== "setValue" && currentSocket && currentRoomId) {
        // Debounce socket emission (300ms)
        if (emitTimer) clearTimeout(emitTimer);
        emitTimer = setTimeout(() => {
          currentSocket.emit(ACTIONS.CODE_CHANGE, {
            roomId: currentRoomId,
            code,
          });
        }, 300);
      }
    });

    // Trigger autocomplete on typing
    editor.on("inputRead", (instance) => {
      if (!instance.state.completionActive) {
        CodeMirror.commands.autocomplete(instance, null, {
          completeSingle: false,
        });
      }
    });

    return () => {
      editor.toTextArea();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to theme changes
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.setOption(
      "theme",
      theme === "light" ? "eclipse" : "dracula"
    );
  }, [theme]);

  // React to language changes
  useEffect(() => {
    if (!editorRef.current || !language) return;
    const mode = langModeMap[language] || { name: "javascript", json: true };
    editorRef.current.setOption("mode", mode);
  }, [language]);

  // Listen for CODE_CHANGE from server
  useEffect(() => {
    if (!socket) return;

    const handleCodeChange = ({ code }) => {
      if (code != null && editorRef.current) {
        editorRef.current.setValue(code);
      }
    };

    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);

    return () => {
      socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
    };
  }, [socket]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <textarea ref={textareaRef} id="realtimeEditor" />
    </div>
  );
});

export default Editor;
