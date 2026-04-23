import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";
import { useGlobalSocket } from "../../hooks/useGlobalSocket";
import "../../styles/social.css";
import "../../styles/messaging.css";

const NotificationDropdown = ({ onOpen }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const dropdownRef = useRef(null);
  const socket = useGlobalSocket();
  const navigate = useNavigate();

  /* ---------- Detect Mobile ---------- */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ---------- Fetch ---------- */
  const fetchNotes = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  /* ---------- Socket ---------- */
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("NEW_NOTIFICATION", handleNewNotif);
    return () => socket.off("NEW_NOTIFICATION", handleNewNotif);
  }, [socket]);

  /* ---------- Click Outside (desktop only) ---------- */
  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile]);

  /* ---------- Click ---------- */
  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notif._id ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch { }
    }

    setIsOpen(false);

    if (notif.actionUrl) navigate(notif.actionUrl);
    else if (notif.type === "follow" && notif.relatedUser)
      navigate(`/profile/${notif.relatedUser.username}`);
    else if (notif.type === "invitation") navigate("/dashboard");
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch { }
  };

  return (
    <div className="notification-wrapper" ref={dropdownRef}>
      {/* BUTTON */}
      <button
        type="button"
        className="notification-bell-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isOpen) onOpen && onOpen(); // close mobile menu
          setIsOpen((o) => !o);
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen &&
        (isMobile ? (
          createPortal(
            <>
              {/* BACKDROP */}
              <div
                className="dm-panel-overlay"
                onClick={() => setIsOpen(false)}
              />

              {/* MOBILE PANEL */}
              <div className="dm-panel dm-panel--mobile glass-panel">

                {/* HEADER */}
                <div className="dm-panel-header">
                  <span className="dm-panel-title">Notifications</span>

                  <div className="header-actions">
                    {unreadCount > 0 && (
                      <button
                        className="mark-all-btn"
                        onClick={handleMarkAllRead}
                      >
                        Mark all
                      </button>
                    )}
                    <button className="text-muted hover:text-primary transition-colors" onClick={() => setIsOpen(false)}><X size={18} /></button>
                  </div>
                </div>

                {/* LIST */}
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`notification-item ${!notif.read ? "unread" : ""}`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="notification-dot" />
                        <div className="notification-content">
                          <p className="notification-msg">{notif.message}</p>
                          <span className="notification-time">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>,
            document.body
          )
        ) : (
          /* DESKTOP */
          <div className="notification-dropdown glass-panel">
            {/* HEADER */}
            <div className="notification-header">
              <h4 className="dm-panel-title">Notifications</h4>

              {unreadCount > 0 && (
                <button
                  className="mark-all-btn"
                  onClick={handleMarkAllRead}
                >
                  Mark all
                </button>
              )}
            </div>

            {/* LIST */}
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  No notifications
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`notification-item ${!notif.read ? "unread" : ""}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="notification-dot" />
                    <div className="notification-content">
                      <p className="notification-msg">{notif.message}</p>
                      <span className="notification-time">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
    </div>
  );
};

export default NotificationDropdown;