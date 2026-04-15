import React from 'react';
import Button from '../ui/Button';

const EditorToolbar = ({
  theme, onToggleTheme,
  selectedLanguage, onSelectLanguage, languages,
  files = [], activeFileId, onSelectFile, saveStatus, isDbFile,
  onSave, onFormat, showHistory, onToggleHistory,
  onToggleChat, showChatPanel, onRun, isCompiling,
  unreadChatCount, showAIPanel, onToggleAI,
  showMeetingPanel, onToggleMeetings,
  onToggleSidebar
}) => {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-left">
        {/* Mobile sidebar hamburger */}
        <button className="sidebar-toggle" onClick={onToggleSidebar} title="Toggle sidebar">
          ☰
        </button>
        <Button variant="outline" size="sm" onClick={onToggleTheme} className="toolbar-icon-btn">
          {theme === "dark" ? "☀️" : "🌙"}
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
        
        <div className="editor-tabs">
          {files.map(file => (
            <div 
              key={file._id || file.id} 
              className={`editor-tab ${activeFileId === (file._id || file.id) ? 'active' : ''}`}
              onClick={() => onSelectFile(file._id || file.id)}
              title={file.name}
            >
              <span className="tab-name">{file.name}</span>
            </div>
          ))}
        </div>

        {saveStatus && (
          <span className={`save-indicator ${saveStatus.includes("✓") ? "saved" : ""}`}>
            {saveStatus}
          </span>
        )}
      </div>

      <div className="toolbar-right">
        {isDbFile && (
          <Button variant="none" className="toolbar-btn chip" onClick={onSave} title="Save">
             💾
          </Button>
        )}
        <Button variant="none" className="toolbar-btn chip" onClick={onFormat} title="Format Code">
          🎨
        </Button>
        {isDbFile && (
          <Button
            variant="none"
            className={`toolbar-btn chip ${showHistory ? "active" : ""}`}
            onClick={onToggleHistory}
            title="Version History"
          >
            📜
          </Button>
        )}
        {isDbFile && (
          <Button
            variant="none"
            className={`toolbar-btn chip ${showMeetingPanel ? "active" : ""}`}
            onClick={onToggleMeetings}
            title="Meetings"
          >
            📅
          </Button>
        )}
        <Button
          variant="none"
          className={`toolbar-btn chip ai-toggle ${showChatPanel ? "active" : ""}`}
          onClick={onToggleChat}
          style={{ position: "relative" }}
          title="Team Chat"
        >
          💬
          {unreadChatCount > 0 && !showChatPanel && (
            <span className="chat-badge round">{unreadChatCount}</span>
          )}
        </Button>
        <Button
          variant="none"
          className={`toolbar-btn chip ai-toggle ${showAIPanel ? "active" : ""}`}
          onClick={onToggleAI}
          title="AI Assistant"
        >
          🤖
        </Button>
        <Button variant="none" className="toolbar-btn chip run-btn" onClick={onRun} disabled={isCompiling} title="Run Code">
          {isCompiling ? "⏳" : "▶ Run"}
        </Button>
      </div>
    </div>
  );
};

export default EditorToolbar;
