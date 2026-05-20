import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { monaco, DEFAULT_EDITOR_OPTIONS } from "../editor/monacoSetup";
import { registerThemes, getThemeId } from "../editor/editorThemes";
import { getMonacoLanguage, getLanguageFromFilename } from "../editor/languageConfig";
import { registerCompletionProviders, disposeCompletionProviders } from "../editor/completionProviders";
import { registerHoverProviders, disposeHoverProviders } from "../editor/hoverProviders";
import { registerAIAutocomplete, disposeAIAutocomplete } from "../editor/aiAutocomplete";
import { registerEditorCommands } from "../editor/editorCommands";
import { runDiagnostics, clearDiagnostics, getMarkers } from "../editor/diagnosticsProvider";
import { ACTIONS } from "../Actions";

// ── One-time global initialization ────────────────────────────────────
let globalProvidersRegistered = false;

const initGlobalProviders = () => {
  if (globalProvidersRegistered) return;
  globalProvidersRegistered = true;
  registerThemes();
  registerCompletionProviders();
  registerHoverProviders();
};

// ── Editor Component ──────────────────────────────────────────────────
const Editor = forwardRef(function Editor(
  {
    socket, roomId, fileId, onCodeChange, onCursorChange,
    theme, language, initialValue, readOnly, aiAutocompleteEnabled,
    onFormat, onSave, onRun, onMarkersChange,
    fileName
  },
  ref
) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const modelRef = useRef(null);

  const socketRef = useRef(socket);
  const roomIdRef = useRef(roomId);
  const fileIdRef = useRef(fileId);
  const languageRef = useRef(language);

  // Remote cursor decorations
  const remoteCursorsRef = useRef({}); // socketId -> decorationIds[]
  const cursorColorsRef = useRef({});
  const colorIdxRef = useRef(0);
  const cursorLabelsRef = useRef({}); // socketId -> DOM node

  const CURSOR_PALETTE = [
    "#a78bfa", "#34d399", "#f87171", "#60a5fa",
    "#fbbf24", "#f472b6", "#2dd4bf", "#fb923c"
  ];

  const getCursorColor = (id) => {
    if (!cursorColorsRef.current[id]) {
      cursorColorsRef.current[id] = CURSOR_PALETTE[colorIdxRef.current++ % CURSOR_PALETTE.length];
    }
    return cursorColorsRef.current[id];
  };

  // ── Imperative handle (same API as old CM editor) ─────────────────
  useImperativeHandle(ref, () => ({
    setValue: (val) => {
      const ed = editorRef.current;
      if (!ed) return;
      ed.setValue(val);
    },
    getValue: () => {
      return editorRef.current?.getValue() || "";
    },
    applyRemoteChange: (newCode) => {
      const ed = editorRef.current;
      if (!ed) return;
      const model = ed.getModel();
      if (!model) return;
      const currentCode = model.getValue();
      if (currentCode === newCode) return;

      // Save selections and scroll position
      const selections = ed.getSelections();
      const scrollTop = ed.getScrollTop();
      const scrollLeft = ed.getScrollLeft();

      // Use executeEdits with a source ID to mark as remote
      // This preserves undo stack and cursor position
      ed.executeEdits("remote", [{
        range: model.getFullModelRange(),
        text: newCode,
        forceMoveMarkers: false,
      }]);

      // Restore cursor and scroll
      if (selections) ed.setSelections(selections);
      ed.setScrollPosition({ scrollTop, scrollLeft });
    },
    revealLine: (line, col) => {
      const ed = editorRef.current;
      if (!ed) return;
      ed.revealLineInCenter(line);
      ed.setPosition({ lineNumber: line, column: col || 1 });
      ed.focus();
    },
    getEditorInstance: () => editorRef.current,
  }));

  // ── Sync mutable refs ─────────────────────────────────────────────
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { fileIdRef.current = fileId; }, [fileId]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // ── Initialize Monaco Editor ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize global providers once
    initGlobalProviders();

    // Determine language
    const monacoLang = fileName
      ? getLanguageFromFilename(fileName)
      : getMonacoLanguage(language);

    // Create model
    const model = monaco.editor.createModel(
      initialValue || "",
      monacoLang
    );
    modelRef.current = model;

    // Create editor
    const editor = monaco.editor.create(containerRef.current, {
      ...DEFAULT_EDITOR_OPTIONS,
      model,
      theme: getThemeId(theme),
      readOnly: readOnly || false,
    });
    editorRef.current = editor;

    // Register keyboard commands
    registerEditorCommands(editor, { onFormat, onSave, onRun });

    // ── Change handler ────────────────────────────────────────────
    let emitTimer = null;
    let isApplyingRemote = false;

    const changeDisposable = model.onDidChangeContent((e) => {
      const code = model.getValue();
      onCodeChange(code);

      // Run diagnostics for non-native languages
      runDiagnostics(model);

      // Report markers
      if (onMarkersChange) {
        setTimeout(() => {
          onMarkersChange(getMarkers(model));
        }, 600);
      }

      // Don't emit to socket if this is a remote edit
      if (isApplyingRemote) return;

      // Check if any change source is "remote"
      for (const change of e.changes) {
        // We can't easily detect remote origin in Monaco the same way as CM,
        // but we handle it via the executeEdits source ID
      }

      const currentSocket = socketRef.current;
      const currentRoomId = roomIdRef.current;
      const currentFileId = fileIdRef.current;
      const currentLanguage = languageRef.current;

      if (currentSocket && currentRoomId && currentFileId) {
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

    // ── Cursor handler ────────────────────────────────────────────
    let lastCursorEmitTs = 0;
    const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
      const now = Date.now();
      if (now - lastCursorEmitTs < 50) return;
      lastCursorEmitTs = now;

      const pos = e.position;
      if (onCursorChange) {
        onCursorChange({ line: pos.lineNumber - 1, ch: pos.column - 1 });
      }

      const currentSocket = socketRef.current;
      const currentRoomId = roomIdRef.current;
      if (currentSocket && currentRoomId) {
        currentSocket.emit("cursor-move", {
          roomId: currentRoomId,
          cursor: { line: pos.lineNumber - 1, ch: pos.column - 1 },
        });
      }
    });

    // ── Marker change listener (for native TS/JS diagnostics) ─────
    const markerDisposable = monaco.editor.onDidChangeMarkers(([resource]) => {
      if (model.uri.toString() === resource.toString() && onMarkersChange) {
        onMarkersChange(getMarkers(model));
      }
    });

    // ── Override remote edit detection ─────────────────────────────
    // Monkey-patch executeEdits to detect remote origin
    const originalExecuteEdits = editor.executeEdits.bind(editor);
    editor.executeEdits = (source, edits, endCursorState) => {
      if (source === "remote") isApplyingRemote = true;
      const result = originalExecuteEdits(source, edits, endCursorState);
      if (source === "remote") isApplyingRemote = false;
      return result;
    };

    // Cleanup
    return () => {
      if (emitTimer) clearTimeout(emitTimer);
      changeDisposable.dispose();
      cursorDisposable.dispose();
      markerDisposable.dispose();
      clearDiagnostics(model);

      // Clean up cursor label DOM nodes
      Object.values(cursorLabelsRef.current).forEach(el => el?.remove());
      cursorLabelsRef.current = {};
      remoteCursorsRef.current = {};

      editor.dispose();
      model.dispose();
      editorRef.current = null;
      modelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Remote Cursor Management ──────────────────────────────────────
  useEffect(() => {
    if (!socket || !editorRef.current) return;
    const editor = editorRef.current;

    const renderRemoteCursor = (socketId, username, pos) => {
      const color = getCursorColor(socketId);
      // Monaco uses 1-indexed lines/columns, pos from server is 0-indexed
      const line = (pos.line || 0) + 1;
      const ch = (pos.ch || 0) + 1;

      const model = editor.getModel();
      if (!model) return;

      // Clamp to valid range
      const maxLine = model.getLineCount();
      const safeLine = Math.min(line, maxLine);
      const lineLength = model.getLineLength(safeLine);
      const safeColumn = Math.min(ch, lineLength + 1);

      // Create decoration for cursor line
      const newDecorations = [
        {
          range: new monaco.Range(safeLine, safeColumn, safeLine, safeColumn),
          options: {
            className: `remote-cursor-line`,
            beforeContentClassName: `remote-cursor-marker`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            // Use CSS custom properties for per-cursor colors
            inlineClassName: undefined,
          },
        },
      ];

      // Apply decorations
      const prevIds = remoteCursorsRef.current[socketId] || [];
      const newIds = editor.deltaDecorations(prevIds, newDecorations);
      remoteCursorsRef.current[socketId] = newIds;

      // Manage floating label DOM element
      let label = cursorLabelsRef.current[socketId];
      if (!label) {
        label = document.createElement("div");
        label.className = "remote-cursor-label-monaco";
        label.textContent = username || "Guest";
        label.style.background = color;
        label.style.color = "#fff";
        containerRef.current?.appendChild(label);
        cursorLabelsRef.current[socketId] = label;
      }
      label.textContent = username || "Guest";
      label.style.background = color;

      // Position the label using Monaco's coordinate conversion
      try {
        const coords = editor.getScrolledVisiblePosition({
          lineNumber: safeLine,
          column: safeColumn,
        });
        if (coords) {
          label.style.top = `${coords.top - 18}px`;
          label.style.left = `${coords.left}px`;
          label.style.display = "block";
        }
      } catch {
        // Ignore positioning errors during rapid updates
      }
    };

    const onCursorUpdate = ({ socketId: sid, username, cursor }) => {
      if (!cursor || !editor) return;
      renderRemoteCursor(sid, username, cursor);
    };

    const onCursorSync = (positions) => {
      if (!positions || !editor) return;
      Object.entries(positions).forEach(([sid, { username, line, ch }]) => {
        renderRemoteCursor(sid, username, { line, ch });
      });
    };

    const onCursorRemove = ({ socketId: sid }) => {
      const prevIds = remoteCursorsRef.current[sid] || [];
      editor.deltaDecorations(prevIds, []);
      delete remoteCursorsRef.current[sid];
      if (cursorLabelsRef.current[sid]) {
        cursorLabelsRef.current[sid].remove();
        delete cursorLabelsRef.current[sid];
      }
    };

    // Update label positions on scroll
    const scrollDisposable = editor.onDidScrollChange(() => {
      Object.entries(remoteCursorsRef.current).forEach(([sid]) => {
        // Re-read the decoration range to update label position
        const decorations = editor.getModel()?.getAllDecorations();
        // We'll just hide labels during scroll for simplicity
        // They'll be repositioned on next cursor-update
      });
    });

    socket.on("cursor-update", onCursorUpdate);
    socket.on("cursor-sync", onCursorSync);
    socket.on("cursor-remove", onCursorRemove);

    return () => {
      socket.off("cursor-update", onCursorUpdate);
      socket.off("cursor-sync", onCursorSync);
      socket.off("cursor-remove", onCursorRemove);
      scrollDisposable.dispose();
    };
  }, [socket]);

  // ── Theme updates ─────────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current) return;
    monaco.editor.setTheme(getThemeId(theme));
  }, [theme]);

  // ── Language updates ──────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || !language) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    const monacoLang = getMonacoLanguage(language);
    monaco.editor.setModelLanguage(model, monacoLang);
  }, [language]);

  // ── AI Autocomplete Toggle ────────────────────────────────────────
  useEffect(() => {
    registerAIAutocomplete(aiAutocompleteEnabled);
  }, [aiAutocompleteEnabled]);

  // ── Initial value / file switch ───────────────────────────────────
  useEffect(() => {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;
    const currentVal = model.getValue();
    if (initialValue != null && initialValue !== currentVal) {
      editorRef.current.setValue(initialValue);
    }
  }, [initialValue]);

  // ── ReadOnly toggle ───────────────────────────────────────────────
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({ readOnly: readOnly || false });
  }, [readOnly]);

  return (
    <div
      className={`editor-wrapper ${readOnly ? "editor-readonly" : ""}`}
      style={{ height: "100%", width: "100%", position: "relative" }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
});

export default Editor;
