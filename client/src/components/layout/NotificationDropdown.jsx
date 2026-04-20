import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../../services/notificationService";
import { useGlobalSocket } from "../../hooks/useGlobalSocket";

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
          if (!isOpen) onOpen && onOpen(); // 🔥 close mobile menu
          setIsOpen((o) => !o);
        }}
      >
        🔔
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
                className="fixed inset-0 bg-black/50 z-[99999]"
                onClick={() => setIsOpen(false)}
              />

              {/* MOBILE PANEL */}
              <div className="fixed top-0 left-0 w-screen h-screen z-[100000] flex flex-col bg-[#0B0F1A] text-white">

                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                  <h4 className="text-sm font-semibold">Notifications</h4>

                  <div className="flex gap-3 items-center">
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-purple-400"
                        onClick={handleMarkAllRead}
                      >
                        Mark all
                      </button>
                    )}
                    <button onClick={() => setIsOpen(false)}>✕</button>
                  </div>
                </div>

                {/* LIST */}
                <div className="flex-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`p-4 border-b border-white/5 ${!notif.read ? "bg-white/5" : ""
                          }`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <p className="text-sm">{notif.message}</p>
                        <span className="text-xs text-gray-400">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
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
          <div className="notification-dropdown absolute top-full mt-2 right-0 w-[380px] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xl border border-[var(--border)] rounded-xl">
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h4 className="text-sm font-semibold">Notifications</h4>

              {unreadCount > 0 && (
                <button
                  className="text-xs text-purple-400"
                  onClick={handleMarkAllRead}
                >
                  Mark all
                </button>
              )}
            </div>

            {/* LIST */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  No notifications
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-3 border-b border-white/5 cursor-pointer ${!notif.read ? "bg-white/5" : ""
                      }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <p className="text-sm">{notif.message}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
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