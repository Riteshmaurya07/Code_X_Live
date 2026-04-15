import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getConversations, getMessages, approveRequest, declineRequest } from '../../services/messageService';
import { ACTIONS } from '../../Actions';
import { useGlobalSocket } from '../../hooks/useGlobalSocket';
import { useDM } from '../../hooks/useDM';
import toast from 'react-hot-toast';
import '../../styles/messaging.css';

const DirectMessaging = () => {
  const { user } = useAuth();
  const socket = useGlobalSocket();
  const { pendingUser, clearPendingUser } = useDM();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('primary');
  const [primaryConvos, setPrimaryConvos] = useState([]);
  const [requestConvos, setRequestConvos] = useState([]);

  const [activeChat, setActiveChat] = useState(null);
  // Track which tab the convo is from so request banner shows correctly
  const [activeChatTab, setActiveChatTab] = useState('primary');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Unread count persists even when panel is closed
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef(null);
  const messagesEndRef = useRef(null);

  /* ─── Click Outside ────────────────────────────────────────────── */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  /* ─── Auto-scroll ──────────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ─── Load Conversations ───────────────────────────────────────── */
  const loadConversations = useCallback(async () => {
    try {
      const { primary, requests } = await getConversations();
      setPrimaryConvos(primary);
      setRequestConvos(requests);

      // Recalculate persistent unread count
      const totalUnread = [...primary, ...requests].reduce(
        (acc, c) => acc + (c.unreadCount || 0), 0
      );
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !activeChat) {
      loadConversations();
    }
  }, [isOpen, activeChat, loadConversations]);

  // Pull count on mount so the badge shows before opening
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // ─── React to openDM() calls from other pages ───────────────────
  useEffect(() => {
    if (!pendingUser) return;
    // Open the panel and load the chat with that user
    setIsOpen(true);
    setActiveChatTab('primary');
    setActiveChat({
      userId: pendingUser._id,
      username: pendingUser.username,
      avatar: pendingUser.avatar || '',
      fullName: pendingUser.fullName || '',
    });
    setIsLoadingMessages(true);
    getMessages(pendingUser._id)
      .then((history) => setMessages(history))
      .catch(() => setMessages([]))
      .finally(() => setIsLoadingMessages(false));
    clearPendingUser();
  }, [pendingUser, clearPendingUser]);

  /* ─── Real-time socket events ──────────────────────────────────── */
  useEffect(() => {
    if (!socket || !user) return;

    const handleReceiveMessage = (msg) => {
      const senderId = msg.sender?.toString();
      const myId = user._id?.toString();

      if (activeChat) {
        const chatWithId = activeChat.userId?.toString();
        // Are they talking to the person who sent this?
        if (senderId === chatWithId || msg.receiver?.toString() === chatWithId) {
          setMessages((prev) => [...prev, msg]);
          return; // Don't show toast if we're already looking at the convo
        }
      }

      // Always refresh convos for badge counts
      loadConversations();

      // Toast notification only for messages from others
      if (senderId !== myId && !isOpen) {
        const senderName = msg.senderName || 'Someone';
        toast(`💬 ${senderName}: ${msg.content?.slice(0, 40)}${msg.content?.length > 40 ? '…' : ''}`, {
          duration: 4000,
          style: {
            background: 'rgba(20, 10, 40, 0.95)',
            color: '#fff',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            backdropFilter: 'blur(10px)',
          },
        });
      }
    };

    socket.on(ACTIONS.GLOBAL_RECEIVE_MESSAGE, handleReceiveMessage);
    return () => {
      socket.off(ACTIONS.GLOBAL_RECEIVE_MESSAGE, handleReceiveMessage);
    };
  }, [socket, user, activeChat, isOpen, loadConversations]);

  /* ─── Open Chat ─────────────────────────────────────────────────── */
  const openChat = async (targetUser, fromTab) => {
    setActiveChatTab(fromTab || activeTab);
    setActiveChat({
      userId: targetUser._id,
      username: targetUser.username,
      avatar: targetUser.avatar,
      fullName: targetUser.fullName,
    });
    setIsLoadingMessages(true);
    try {
      const history = await getMessages(targetUser._id);
      setMessages(history);
      // After reading, refresh unread counts
      loadConversations();
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  /* ─── Send Message ──────────────────────────────────────────────── */
  const handleSendMessage = () => {
    if (!inputValue.trim() || !activeChat || !socket) return;

    socket.emit(ACTIONS.GLOBAL_SEND_MESSAGE, {
      recipientId: activeChat.userId,
      content: inputValue,
    });

    setInputValue('');
  };

  /* ─── Approve / Decline ─────────────────────────────────────────── */
  const handleApprove = async (userId) => {
    try {
      await approveRequest(userId);
      toast.success('Message request approved!');
      setActiveChatTab('primary');
      setActiveChat(prev => ({ ...prev, approved: true }));
      await loadConversations();
    } catch (err) {
      toast.error('Failed to approve request');
      console.error(err);
    }
  };

  const handleDecline = async (userId) => {
    try {
      await declineRequest(userId);
      toast.success('Request declined');
      setActiveChat(null);
      await loadConversations();
    } catch (err) {
      toast.error('Failed to decline request');
      console.error(err);
    }
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isRequestView = activeChatTab === 'requests' && activeChat && !activeChat.approved;

  return (
    <div className="dm-dropdown-container" ref={dropdownRef}>
      <button
        className="dm-toggle-btn"
        onClick={() => setIsOpen((o) => !o)}
        title="Messages"
        aria-label="Open Direct Messages"
      >
        📩
        {unreadCount > 0 && <span className="dm-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="dm-panel glass-panel">
          {!activeChat ? (
            <>
              {/* Header */}
              <div className="dm-panel-header">
                <span className="dm-panel-title">Messages</span>
              </div>

              {/* Tabs */}
              <div className="dm-tabs">
                <button
                  className={`dm-tab ${activeTab === 'primary' ? 'active' : ''}`}
                  onClick={() => setActiveTab('primary')}
                >
                  Primary
                  {primaryConvos.reduce((a, c) => a + c.unreadCount, 0) > 0 && (
                    <span className="dm-tab-badge">
                      {primaryConvos.reduce((a, c) => a + c.unreadCount, 0)}
                    </span>
                  )}
                </button>
                <button
                  className={`dm-tab ${activeTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('requests')}
                >
                  Requests
                  {requestConvos.length > 0 && (
                    <span className="dm-tab-badge dm-tab-badge--purple">{requestConvos.length}</span>
                  )}
                </button>
              </div>

              {/* Conversation List */}
              <div className="dm-conversations">
                {(activeTab === 'primary' ? primaryConvos : requestConvos).length === 0 ? (
                  <div className="dm-empty">
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>
                      {activeTab === 'primary' ? '💬' : '📥'}
                    </span>
                    {activeTab === 'primary'
                      ? 'No conversations yet.'
                      : 'No message requests.'}
                  </div>
                ) : (
                  (activeTab === 'primary' ? primaryConvos : requestConvos).map((convo) => (
                    <div
                      key={convo.user._id}
                      className="dm-conversation-item"
                      onClick={() => openChat(convo.user, activeTab)}
                    >
                      <div className="dm-avatar">
                        {convo.user.avatar
                          ? <img src={convo.user.avatar} alt={convo.user.username} />
                          : convo.user.username[0].toUpperCase()}
                      </div>
                      <div className="dm-info">
                        <div className="dm-info-header">
                          <span className="dm-username">
                            {convo.user.fullName || convo.user.username}
                          </span>
                          <span className="dm-time">
                            {formatTime(convo.lastMessage.createdAt)}
                          </span>
                        </div>
                        <div className="dm-preview">
                          {convo.lastMessage.sender?.toString() === user._id?.toString()
                            ? 'You: '
                            : ''}
                          {convo.lastMessage.content}
                        </div>
                      </div>
                      {convo.unreadCount > 0 && (
                        <span className="dm-convo-badge">{convo.unreadCount}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* ─── Chat View ─────────────────────────────────────── */
            <div className="dm-chat-view">
              <div className="dm-chat-header">
                <button
                  className="dm-back-btn"
                  onClick={() => { setActiveChat(null); loadConversations(); }}
                  title="Back"
                >
                  ←
                </button>
                <div className="dm-avatar" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
                  {activeChat.avatar
                    ? <img src={activeChat.avatar} alt="avatar" />
                    : activeChat.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#fff', fontSize: '0.875rem', display: 'block' }}>
                    {activeChat.fullName || activeChat.username}
                  </strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    @{activeChat.username}
                  </span>
                </div>
              </div>

              {/* Request Banner */}
              {isRequestView && (
                <div className="dm-request-actions">
                  <span className="dm-request-text">
                    📬 Message request from <strong>@{activeChat.username}</strong>
                  </span>
                  <div className="dm-request-btns">
                    <button
                      onClick={() => handleApprove(activeChat.userId)}
                      className="btn-premium"
                      style={{ padding: '5px 14px', fontSize: '0.75rem' }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleDecline(activeChat.userId)}
                      className="dm-decline-btn"
                    >
                      ✗ Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="dm-messages">
                {isLoadingMessages ? (
                  <div className="dm-empty">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="dm-empty">No messages yet. Say hello! 👋</div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine = msg.sender?.toString() === user._id?.toString();
                    return (
                      <div key={msg._id || i} className={`dm-bubble-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                        <div className="dm-bubble">{msg.content}</div>
                        <span className="dm-bubble-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="dm-input-area">
                <input
                  type="text"
                  className="dm-input"
                  placeholder={isRequestView ? 'Approve request to reply…' : 'Type a message…'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isRequestView}
                  autoFocus={!isRequestView}
                />
                <button
                  className="dm-send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isRequestView}
                  title="Send"
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DirectMessaging;
