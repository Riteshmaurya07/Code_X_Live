import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api";
import { X, Trash2 } from "lucide-react";

function ShareModal({ projectId, onClose }) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [role, setRole] = useState("editor");
  const [shareUrl, setShareUrl] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollaborators();
  }, [projectId]);

  const loadCollaborators = async () => {
    try {
      const { data } = await api.get(`/api/sharing/${projectId}/collaborators`);
      setCollaborators(data.collaborators || []);
      setOwner(data.owner);
      if (data.shareToken) {
        const baseUrl = window.location.origin;
        setShareUrl(`${baseUrl}/join/${data.shareToken}`);
      }
    } catch {
      // May not have permission to view this
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim()) return;

    setLoading(true);
    try {
      const { data } = await api.post(`/api/sharing/${projectId}/invite`, {
        emailOrUsername: emailOrUsername.trim(),
        role,
      });
      toast.success(data.message);
      setEmailOrUsername("");
      loadCollaborators();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to invite");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm("Remove this collaborator?")) return;
    try {
      await api.delete(`/api/sharing/${projectId}/collaborator/${userId}`);
      toast.success("Collaborator removed");
      loadCollaborators();
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleGenerateLink = async () => {
    try {
      const { data } = await api.post(`/api/sharing/${projectId}/share-link`);
      setShareUrl(data.shareUrl);
      toast.success("Share link generated!");
    } catch {
      toast.error("Failed to generate link");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied!");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share Project</h3>
          <button className="toolbar-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Invite form */}
        <form className="share-invite-form" onSubmit={handleInvite}>
          <input
            type="text"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder="Username or email"
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" className="btn-primary btn-sm" disabled={loading}>
            Invite
          </button>
        </form>

        {/* Share link */}
        <div className="share-link-section">
          <h4>Share Link</h4>
          {shareUrl ? (
            <div className="share-link-row">
              <input type="text" value={shareUrl} readOnly />
              <button className="btn-primary btn-sm" onClick={copyLink}>
                Copy
              </button>
            </div>
          ) : (
            <button className="btn-outline" onClick={handleGenerateLink}>
              Generate Share Link
            </button>
          )}
        </div>

        {/* Collaborator list */}
        <div className="collaborators-list">
          <h4>Collaborators</h4>
          {owner && (
            <div className="collab-item">
              <span>{owner.username}</span>
              <span className="role-badge owner">Owner</span>
            </div>
          )}
          {collaborators.map((c) => (
            <div key={c.user?._id || c._id} className="collab-item">
              <span>{c.user?.username || "User"}</span>
              <div className="collab-actions">
                <span className={`role-badge ${c.role}`}>{c.role}</span>
                <button
                  className="file-action-btn"
                  title="Remove"
                  onClick={() => handleRemove(c.user?._id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {collaborators.length === 0 && (
            <p className="ai-hint">No collaborators yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
