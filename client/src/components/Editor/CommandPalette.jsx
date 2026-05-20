import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, Command, X } from "lucide-react";

/**
 * CommandPalette — VS Code Ctrl+Shift+P style command launcher.
 */
function CommandPalette({ isOpen, onClose, commands = [] }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const lq = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(lq) ||
      c.category?.toLowerCase().includes(lq)
    );
  }, [commands, query]);

  // Reset selection when query changes
  useEffect(() => setSelectedIdx(0), [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIdx]) {
          filtered[selectedIdx].action?.();
          onClose();
        }
        break;
      case "Escape":
        onClose();
        break;
    }
  }, [filtered, selectedIdx, onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Close on Escape globally
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette">
        <div className="command-palette-input-wrap">
          <Command size={14} className="command-palette-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button className="command-palette-clear" onClick={() => setQuery("")}>
              <X size={12} />
            </button>
          )}
        </div>
        <div className="command-palette-list" ref={listRef}>
          {filtered.length === 0 && (
            <div className="command-palette-empty">No matching commands</div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id || i}
              className={`command-palette-item ${i === selectedIdx ? "selected" : ""}`}
              onMouseEnter={() => setSelectedIdx(i)}
              onClick={() => { cmd.action?.(); onClose(); }}
            >
              <span className="command-item-label">{cmd.label}</span>
              {cmd.keybinding && (
                <span className="command-item-keybinding">{cmd.keybinding}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
