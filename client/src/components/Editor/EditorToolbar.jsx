import React from 'react';
import Button from '../ui/Button';
import { Menu, Sun, Moon, Save, Download, Paintbrush, History, Calendar, MessageSquare, Bot, LoaderCircle, Play, Phone, Video, Sparkles } from 'lucide-react';

const EditorToolbar = ({
  theme, onToggleTheme,
  selectedLanguage, onSelectLanguage, languages,
  files = [], activeFileId, onSelectFile, saveStatus, isDbFile,
  onSave, onFormat, showHistory, onToggleHistory,
  onToggleChat, showChatPanel, onRun, isCompiling,
  unreadChatCount, showAIPanel, onToggleAI,
  showMeetingPanel, onToggleMeetings,
  aiAutocompleteEnabled, onToggleAIAutocomplete,
  onToggleSidebar, onDownloadProject,
  callStatus, onStartCall, onJoinCall
}) => {
  return (
    <div className="editor-toolbar">
      <div className="toolbar-left">
        {/* Mobile sidebar hamburger */}
        <button className="sidebar-toggle" onClick={onToggleSidebar} title="Toggle sidebar">
          <Menu size={20} />
        </button>
        <Button variant="outline" size="sm" onClick={onToggleTheme} className="toolbar-icon-btn">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
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
        <Button variant="outline" className="toolbar-btn chip" onClick={onSave} title="Save">
           <Save size={18} />
        </Button>
        <Button variant="outline" className="toolbar-btn chip" onClick={onDownloadProject} title="Download as ZIP">
          <Download size={18} />
        </Button>
        <Button variant="outline" className="toolbar-btn chip" onClick={onFormat} title="Format Code">
          <Paintbrush size={18} />
        </Button>
        <Button
          variant="outline"
          className={`toolbar-btn chip ${showHistory ? "active" : ""}`}
          onClick={onToggleHistory}
          title="Version History"
        >
          <History size={18} />
        </Button>
        <Button
          variant="outline"
          className={`toolbar-btn chip ${showMeetingPanel ? "active" : ""}`}
          onClick={onToggleMeetings}
          title="Meetings"
        >
          <Calendar size={18} />
        </Button>
        <Button
          variant="outline"
          className={`toolbar-btn chip ai-toggle ${showChatPanel ? "active" : ""}`}
          onClick={onToggleChat}
          style={{ position: "relative" }}
          title="Team Chat"
        >
          <MessageSquare size={18} />
          {unreadChatCount > 0 && !showChatPanel && (
            <span className="chat-badge round">{unreadChatCount}</span>
          )}
        </Button>
        <Button
          variant="outline"
          className={`toolbar-btn chip ai-toggle ${showAIPanel ? "active" : ""}`}
          onClick={onToggleAI}
          title="AI Assistant"
        >
          <Bot size={18} />
        </Button>
        <Button
          variant="outline"
          className={`toolbar-btn chip ${aiAutocompleteEnabled ? "active" : ""}`}
          onClick={onToggleAIAutocomplete}
          title={aiAutocompleteEnabled ? "Disable AI Autocomplete" : "Enable AI Autocomplete"}
        >
          <Sparkles size={18} />
        </Button>

        {/* Video/Audio Call Buttons */}
        <div className="call-toolbar-group">
          {callStatus === 'idle' ? (
            <>
              <Button
                variant="outline"
                className="toolbar-btn chip call-btn"
                onClick={() => onStartCall('audio')}
                title="Start Audio Call"
              >
                <Phone size={18} className="text-green-500" />
              </Button>
              <Button
                variant="outline"
                className="toolbar-btn chip call-btn"
                onClick={() => onStartCall('video')}
                title="Start Video Call"
              >
                <Video size={18} className="text-green-500" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="toolbar-btn chip call-btn active"
              onClick={onJoinCall}
              disabled={callStatus === 'active'}
              title={callStatus === 'active' ? "Call in progress" : "Join Call"}
            >
              <Phone size={18} className="text-green-500" />
              <span className="active-indicator"></span>
            </Button>
          )}
        </div>

        <Button variant="primary" className="toolbar-btn chip run-btn" onClick={onRun} disabled={isCompiling} title="Run Code">
          {isCompiling ? <LoaderCircle size={16} className="animate-spin" /> : <><Play size={16} fill="currentColor" /> Run</>}
        </Button>
      </div>
    </div>
  );
};

export default EditorToolbar;
