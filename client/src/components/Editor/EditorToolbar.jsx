import React from 'react';
import Button from '../ui/Button';

const EditorToolbar = ({
  theme, onToggleTheme,
  selectedLanguage, onSelectLanguage, languages,
  activeFileName, saveStatus, isDbFile,
  onSave, onFormat, showHistory, onToggleHistory,
  onToggleChat, showChatPanel, onRun, isCompiling,
  unreadChatCount, showAIPanel, onToggleAI,
  onToggleSidebar
}) => {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-left">
        {/* Mobile sidebar hamburger */}
        <button className="sidebar-toggle" onClick={onToggleSidebar} title="Toggle sidebar">
          ☰
        </button>
        <Button variant="outline" size="sm" onClick={onToggleTheme}>
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </Button>
        <select
          className="toolbar-select"
          value={selectedLanguage}
          onChange={(e) => onSelectLanguage(e.target.value)}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
        <span className="active-file-name">
          {activeFileName || "untitled"}
        </span>
        {saveStatus && (
          <span className={`save-indicator ${saveStatus.includes("✓") ? "saved" : ""}`}>
            {saveStatus}
          </span>
        )}
      </div>

      <div className="toolbar-right">
        {isDbFile && (
          <Button variant="none" className="toolbar-btn" onClick={onSave}>
             💾 Save
          </Button>
        )}
        <Button variant="none" className="toolbar-btn" onClick={onFormat}>
          🎨 Format
        </Button>
        {isDbFile && (
          <Button
            variant="none"
            className={`toolbar-btn ${showHistory ? "active" : ""}`}
            onClick={onToggleHistory}
          >
            📜 History
          </Button>
        )}
        <Button variant="none" className="toolbar-btn run-btn" onClick={onRun} disabled={isCompiling}>
          {isCompiling ? "⏳ Running..." : "▶ Run"}
        </Button>
        <Button
          variant="none"
          className={`toolbar-btn ai-toggle ${showChatPanel ? "active" : ""}`}
          onClick={onToggleChat}
          style={{ position: "relative" }}
        >
          💬 Chat
          {unreadChatCount > 0 && !showChatPanel && (
            <span className="chat-badge">{unreadChatCount}</span>
          )}
        </Button>
        <Button
          variant="none"
          className={`toolbar-btn ai-toggle ${showAIPanel ? "active" : ""}`}
          onClick={onToggleAI}
        >
          🤖 AI
        </Button>
      </div>
    </div>
  );
};

export default EditorToolbar;
