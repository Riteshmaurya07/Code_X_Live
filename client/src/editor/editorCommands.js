/**
 * editorCommands.js — Command registry and keyboard shortcut setup.
 */
import { monaco } from "./monacoSetup";

/**
 * Register custom keyboard commands on a Monaco editor instance.
 * @param {monaco.editor.IStandaloneCodeEditor} editor - The editor instance
 * @param {Object} handlers - Callback handlers for each command
 */
export const registerEditorCommands = (editor, handlers = {}) => {
  const { onFormat, onSave, onRun, onToggleCommandPalette } = handlers;

  // Format Document (Shift+Alt+F — same as VS Code)
  if (onFormat) {
    editor.addAction({
      id: "codexlive.formatDocument",
      label: "Format Document",
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      contextMenuGroupId: "1_modification",
      contextMenuOrder: 1,
      run: onFormat,
    });
  }

  // Save (Ctrl+S)
  if (onSave) {
    editor.addAction({
      id: "codexlive.save",
      label: "Save File",
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      ],
      run: onSave,
    });
  }

  // Run Code (Ctrl+Enter or F5)
  if (onRun) {
    editor.addAction({
      id: "codexlive.runCode",
      label: "Run Code",
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        monaco.KeyCode.F5,
      ],
      run: onRun,
    });
  }

  // Command Palette (Ctrl+Shift+P)
  if (onToggleCommandPalette) {
    editor.addAction({
      id: "codexlive.commandPalette",
      label: "Command Palette",
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
      ],
      run: onToggleCommandPalette,
    });
  }

  // Toggle Word Wrap (Alt+Z)
  editor.addAction({
    id: "codexlive.toggleWordWrap",
    label: "Toggle Word Wrap",
    keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
    run: (ed) => {
      const current = ed.getOption(monaco.editor.EditorOption.wordWrap);
      ed.updateOptions({ wordWrap: current === "off" ? "on" : "off" });
    },
  });

  // Toggle Minimap
  editor.addAction({
    id: "codexlive.toggleMinimap",
    label: "Toggle Minimap",
    run: (ed) => {
      const current = ed.getOption(monaco.editor.EditorOption.minimap);
      ed.updateOptions({ minimap: { enabled: !current.enabled } });
    },
  });

  // Duplicate Line (Ctrl+Shift+D)
  editor.addAction({
    id: "codexlive.duplicateLine",
    label: "Duplicate Line",
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD,
    ],
    run: (ed) => {
      ed.getAction("editor.action.copyLinesDownAction")?.run();
    },
  });
};
