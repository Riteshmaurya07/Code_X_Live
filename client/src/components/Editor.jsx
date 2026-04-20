import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import CodeMirror from "codemirror";
import "codemirror/addon/selection/mark-selection";

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
  { socket, roomId, fileId, onCodeChange, theme, language, initialValue, readOnly },
  ref
) {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  const socketRef = useRef(socket);
  const roomIdRef = useRef(roomId);
  const fileIdRef = useRef(fileId);
  const languageRef = useRef(language);

  useImperativeHandle(ref, () => ({
    setValue: (val) => {
      if (editorRef.current) {
        editorRef.current.setValue(val);
      }
    },
    getValue: () => {
      return editorRef.current?.getValue() || "";
    },
    // Expose applyRemoteChange for targeted remote updates
    applyRemoteChange: (newCode) => {
      const cm = editorRef.current;
      if (!cm) return;
      const currentCode = cm.getValue();
      if (currentCode === newCode) return; // No-op

      // Save cursor and scroll BEFORE any document mutation
      const cursor = cm.getCursor();
      const scrollInfo = cm.getScrollInfo();

      // Use replaceRange instead of setValue.
      // setValue resets the entire document (cursor jumps to line 0, undo history
      // cleared, re-render races with setCursor). replaceRange patches the content
      // in-place and preserves internal CM state.
      // Wrapping in cm.operation() batches the replaceRange + setCursor into a
      // single render frame so the cursor is atomically restored before any repaint.
      cm.operation(() => {
        const lastLine = cm.lastLine();
        const lastCh = cm.getLine(lastLine).length;
        // "+remote" origin prevents the change listener from re-emitting CODE_CHANGE
        cm.replaceRange(
          newCode,
          { line: 0, ch: 0 },
          { line: lastLine, ch: lastCh },
          "+remote"
        );
        cm.setCursor(cursor);
        cm.scrollTo(scrollInfo.left, scrollInfo.top);
      });
    },
  }));

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    fileIdRef.current = fileId;
  }, [fileId]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

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
      readOnly: false,
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
      const currentFileId = fileIdRef.current;
      const currentLanguage = languageRef.current;

      if (origin !== "setValue" && origin !== "+remote" && currentSocket && currentRoomId && currentFileId) {
        // Debounce socket emission (300ms)
        if (emitTimer) clearTimeout(emitTimer);
        emitTimer = setTimeout(() => {
          currentSocket.emit(ACTIONS.CODE_CHANGE, {
            roomId: currentRoomId,
            fileId: currentFileId,
            code,
            language: currentLanguage
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

    // cursorActivity: emit cursor-move to socket, throttled to 50ms
    const lastCursorEmit = { ts: 0 };
    editor.on("cursorActivity", (instance) => {
      const now = Date.now();
      if (now - lastCursorEmit.ts < 50) return;
      lastCursorEmit.ts = now;

      const currentSocket = socketRef.current;
      const currentRoomId = roomIdRef.current;
      if (!currentSocket || !currentRoomId) return;

      const cursor = instance.getCursor();
      currentSocket.emit("cursor-move", {
        roomId: currentRoomId,
        cursor: { line: cursor.line, ch: cursor.ch },
      });
    });

    return () => {
      editor.toTextArea();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Remote Cursor Management ────────────────────────────────────
  const remoteCursorsRef = useRef({});
  const cursorColorsRef = useRef({});
  const colorIdxRef = useRef(0);

  useEffect(() => {
    if (!socket || !editorRef.current) return;
    const editor = editorRef.current;

    const palette = [
      "#a78bfa", "#34d399", "#f87171", "#60a5fa",
      "#fbbf24", "#f472b6", "#2dd4bf", "#fb923c"
    ];

    const getColor = (id) => {
      if (!cursorColorsRef.current[id]) {
        cursorColorsRef.current[id] = palette[colorIdxRef.current++ % palette.length];
      }
      return cursorColorsRef.current[id];
    };

    const renderRemoteCursor = (socketId, username, pos) => {
      if (remoteCursorsRef.current[socketId]) {
        remoteCursorsRef.current[socketId].clear();
      }
      const color = getColor(socketId);
      const el = document.createElement("span");
      el.className = "remote-cursor";
      el.style.cssText = `
        position: absolute;
        border-left: 2px solid ${color};
        height: 1.2em;
        display: inline-block;
        pointer-events: none;
        z-index: 10;
      `;
      const label = document.createElement("span");
      label.className = "remote-cursor-label";
      // Ensure we display some fallback if username is undefined
      label.textContent = username || "Guest";
      label.style.cssText = `
        background: ${color};
        color: #fff;
        font-size: 10px;
        font-family: Inter, sans-serif;
        padding: 1px 4px;
        border-radius: 3px;
        position: absolute;
        top: -16px;
        left: 0;
        white-space: nowrap;
        pointer-events: none;
        z-index: 11;
      `;
      el.appendChild(label);
      const bookmark = editor.setBookmark(
        { line: pos.line, ch: pos.ch },
        { widget: el, insertLeft: true }
      );
      remoteCursorsRef.current[socketId] = bookmark;
    };

    const onCursorUpdate = ({ socketId, username, cursor }) => {
      if (!cursor || !editor) return;
      // Prevent rendering cursor past document end which crashes setBookmark
      if (cursor.line > editor.lineCount()) return;
      renderRemoteCursor(socketId, username, cursor);
    };

    const onCursorSync = (positions) => {
      if (!positions || !editor) return;
      Object.entries(positions).forEach(([sid, { username, line, ch }]) => {
        if (line <= editor.lineCount()) {
          renderRemoteCursor(sid, username, { line, ch });
        }
      });
    };

    const onCursorRemove = ({ socketId }) => {
      if (remoteCursorsRef.current[socketId]) {
        remoteCursorsRef.current[socketId].clear();
        delete remoteCursorsRef.current[socketId];
      }
    };

    socket.on("cursor-update", onCursorUpdate);
    socket.on("cursor-sync", onCursorSync);
    socket.on("cursor-remove", onCursorRemove);

    return () => {
      socket.off("cursor-update", onCursorUpdate);
      socket.off("cursor-sync", onCursorSync);
      socket.off("cursor-remove", onCursorRemove);
    };
  }, [socket]);

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

  // React to file switches (initialValue changes)
  useEffect(() => {
    if (!editorRef.current) return;
    const currentVal = editorRef.current.getValue();
    // Only update if the value actually differs to avoid resetting cursor
    if (initialValue != null && initialValue !== currentVal) {
      editorRef.current.setValue(initialValue);
    }
  }, [initialValue]);

  // React to readOnly changes
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.setOption("readOnly", readOnly ? true : false);
  }, [readOnly]);

  return (
    <div className={`editor-wrapper ${readOnly ? "editor-readonly" : ""}`} style={{ height: "100%", width: "100%" }}>
      <textarea ref={textareaRef} id="realtimeEditor" />
    </div>
  );
});

export default Editor;
