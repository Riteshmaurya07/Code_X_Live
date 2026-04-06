import React, { useState, useRef, useEffect } from "react";
import Avatar from "react-avatar";

function Client({ username, isAdmin, isCurrentUser, isAdminUser, permission, onKick, onSetPermission, onMessageUser }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef(null);

  const canManage = isAdmin && !isCurrentUser && !isAdminUser;

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

  const handleSetEditor = () => { onSetPermission(username, "editor"); setShowMenu(false); };
  const handleSetViewer = () => { onSetPermission(username, "viewer"); setShowMenu(false); };

  const getBadge = () => {
    if (isAdminUser) return { label: "Admin", className: "role-badge role-admin" };
    if (permission === "viewer") return { label: "Viewer", className: "role-badge role-viewer" };
    return { label: "Editor", className: "role-badge role-editor" };
  };

  const badge = getBadge();

  return (
    <>
      <div className="client-item">
        <div
          className="client-avatar-wrap"
          style={{ cursor: canManage ? "pointer" : "default" }}
          onClick={() => canManage && setShowMenu(!showMenu)}
          ref={menuRef}
        >
          <Avatar name={username} size={28} round="6px" textSizeRatio={2.5} />

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

        <div className="client-info">
          <span className="client-name">
            {username}
            {isCurrentUser && <span className="client-you-tag">(you)</span>}
          </span>
          <span className={badge.className}>{badge.label}</span>
        </div>

        <div className="client-actions">
          {!isCurrentUser && (
            <button
              className="client-action-btn"
              onClick={(e) => { e.stopPropagation(); if (onMessageUser) onMessageUser(username); }}
              title={`Direct Message ${username}`}
            >
              💬
            </button>
          )}
          {canManage && (
            <button
              className="client-action-btn danger"
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              title={`Manage ${username}`}
            >
              ⋮
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="kick-confirm-overlay" onClick={handleCancel}>
          <div className="kick-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="kick-confirm-icon">🚫</div>
            <h4>Remove User</h4>
            <p>
              Remove <strong>{username}</strong> from this session?
              <br />
              <span className="client-you-tag">
                They will be banned from rejoining until approved.
              </span>
            </p>
            <div className="kick-confirm-actions">
              <button className="kick-cancel-btn" onClick={handleCancel}>Cancel</button>
              <button className="kick-confirm-btn" onClick={handleConfirm}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Client;
