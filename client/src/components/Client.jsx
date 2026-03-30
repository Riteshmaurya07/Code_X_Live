import React, { useState, useRef, useEffect } from "react";
import Avatar from "react-avatar";

function Client({ username, isAdmin, isCurrentUser, isAdminUser, permission, onKick, onSetPermission, onMessageUser }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef(null);

  const canManage = isAdmin && !isCurrentUser && !isAdminUser;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleKickClick = () => {
    setShowMenu(false);
    setShowConfirm(true);
  };

  const handleConfirm = (e) => {
    e.stopPropagation();
    onKick(username);
    setShowConfirm(false);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  const handleSetEditor = () => {
    onSetPermission(username, "editor");
    setShowMenu(false);
  };

  const handleSetViewer = () => {
    onSetPermission(username, "viewer");
    setShowMenu(false);
  };

  // Badge configuration
  const getBadge = () => {
    if (isAdminUser) {
      return { label: "Admin", className: "role-badge role-admin" };
    }
    if (permission === "viewer") {
      return { label: "Viewer", className: "role-badge role-viewer" };
    }
    return { label: "Editor", className: "role-badge role-editor" };
  };

  const badge = getBadge();

  return (
    <>
      <div
        className="client-item"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 4px",
          borderRadius: "6px",
          gap: "8px",
          position: "relative",
        }}
      >
        {/* Avatar — click to open admin menu */}
        <div
          style={{ position: "relative", cursor: canManage ? "pointer" : "default" }}
          onClick={() => canManage && setShowMenu(!showMenu)}
          ref={menuRef}
        >
          <Avatar
            name={username}
            size={28}
            round="6px"
            textSizeRatio={2.5}
          />

          {/* Admin dropdown menu */}
          {showMenu && canManage && (
            <div className="permission-menu">
              <button
                className={`permission-menu-item ${permission === 'editor' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleSetEditor(); }}
              >
                <span>✏️</span> Make Editor
              </button>
              <button
                className={`permission-menu-item ${permission === 'viewer' ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleSetViewer(); }}
              >
                <span>👁</span> Make Viewer
              </button>
              <div className="permission-menu-divider" />
              <button
                className="permission-menu-item danger"
                onClick={(e) => { e.stopPropagation(); handleKickClick(); }}
              >
                <span>🚫</span> Remove
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}>
            {username}
            {isCurrentUser && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginLeft: "4px" }}>
                (you)
              </span>
            )}
          </span>

          {/* Role badge */}
          <span className={badge.className}>
            {badge.label}
          </span>
        </div>

        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          {/* Quick message button — visible for other users */}
          {!isCurrentUser && (
            <button
              className="action-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onMessageUser) onMessageUser(username);
              }}
              title={`Direct Message ${username}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: "2px 4px",
                borderRadius: "4px",
                opacity: 0,
                transition: "opacity 0.2s, background 0.2s",
                color: "var(--text-muted)",
                lineHeight: 1,
              }}
            >
              💬
            </button>
          )}

          {/* Quick kick button — visible on hover for admin viewing non-admin users */}
          {canManage && (
            <button
              className="kick-btn action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title={`Manage ${username}`}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: "2px 4px",
                borderRadius: "4px",
                opacity: 0,
                transition: "opacity 0.2s, background 0.2s",
                color: "var(--text-muted)",
                lineHeight: 1,
              }}
            >
              ⋮
            </button>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="kick-confirm-overlay" onClick={handleCancel}>
          <div className="kick-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kick-confirm-icon">🚫</div>
            <h4>Remove User</h4>
            <p>
              Remove <strong>{username}</strong> from this session?
              <br />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                They will be banned from rejoining until approved.
              </span>
            </p>
            <div className="kick-confirm-actions">
              <button className="kick-cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button className="kick-confirm-btn" onClick={handleConfirm}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Client;
