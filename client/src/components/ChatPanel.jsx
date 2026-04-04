import React, { useState, useRef, useEffect } from "react";

function ChatPanel({
  roomMessages,
  privateMessages,
  activeTab,
  onTabChange,
  onSendMessage,
  onClose,
  currentUser,
  unreadCounts,
}) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change or tab changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages, privateMessages, activeTab]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onSendMessage(inputValue, activeTab);
    setInputValue("");
  };

  const getActiveMessages = () => {
    if (activeTab === "Everyone") {
      return roomMessages;
    }
    return privateMessages[activeTab] || [];
  };

  const activeMessages = getActiveMessages();

  // Combine tabs: "Everyone" + all users we have DM history with or an active unread count
  const dmTabs = Object.keys(privateMessages);
  // Add any tabs that might have unread counts but no messages yet (edge case, but good to cover)
  Object.keys(unreadCounts).forEach((key) => {
    if (key !== "Everyone" && !dmTabs.includes(key) && unreadCounts[key] > 0) {
      dmTabs.push(key);
    }
  });
  // Also ensure the currently active tab is in the list, even if it's empty newly opened DM
  if (activeTab !== "Everyone" && !dmTabs.includes(activeTab)) {
    dmTabs.push(activeTab);
  }

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h3>In-Room Chat</h3>
        <button className="toolbar-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="chat-tabs">
        <button
          className={`chat-tab ${activeTab === "Everyone" ? "active" : ""}`}
          onClick={() => onTabChange("Everyone")}
        >
          Everyone
          {unreadCounts["Everyone"] > 0 && activeTab !== "Everyone" && (
            <span className="unread-badge">{unreadCounts["Everyone"]}</span>
          )}
        </button>
        {dmTabs.map((username) => (
          <button
            key={username}
            className={`chat-tab ${activeTab === username ? "active" : ""}`}
            onClick={() => onTabChange(username)}
          >
            {username}
            {unreadCounts[username] > 0 && activeTab !== username && (
              <span className="unread-badge">{unreadCounts[username]}</span>
            )}
            <span 
              className="chat-tab-close" 
              onClick={(e) => {
                e.stopPropagation();
                // If closing active tab, switch to Everyone
                if (activeTab === username) onTabChange("Everyone");
                // Note: Actual tab removal logic would need to clear it from EditorPage state if desired,
                // but for MVP it's simpler to just switch tabs.
              }}
            >
              
            </span>
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {activeMessages.length === 0 ? (
          <div className="chat-empty">No messages yet. Start the conversation!</div>
        ) : (
          activeMessages.map((msg, idx) => {
            const isMe = msg.senderName === currentUser;
            return (
              <div key={idx} className={`chat-msg ${isMe ? "user" : "assistant"}`}>
                <div className="msg-header">
                  <span className="msg-role">{isMe ? "You" : msg.senderName}</span>
                  <span className="msg-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="msg-content">{msg.message}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={activeTab === "Everyone" ? "Message everyone..." : `Message ${activeTab}...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" disabled={!inputValue.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
