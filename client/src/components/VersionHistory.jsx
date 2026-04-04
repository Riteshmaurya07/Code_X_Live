import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../services/api";

function VersionHistory({ fileId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewContent, setPreviewContent] = useState(null);

  useEffect(() => {
    if (!fileId) return;
    loadVersions();
  }, [fileId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/files/${fileId}/versions`);
      setVersions(data);
    } catch {
      toast.error("Failed to load version history");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId) => {
    if (!confirm("Restore this version? Current changes will be saved as a snapshot.")) return;

    try {
      const { data } = await api.post(`/api/files/versions/${versionId}/restore`);
      toast.success("Version restored!");
      onRestore?.(data.file.content);
      loadVersions();
    } catch {
      toast.error("Failed to restore version");
    }
  };

  const togglePreview = (version) => {
    if (previewContent === version._id) {
      setPreviewContent(null);
    } else {
      setPreviewContent(version._id);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="version-panel">
      <div className="version-header">
        <h3>📜 Version History</h3>
        <button className="toolbar-btn" onClick={onClose}>✕</button>
      </div>

      <div className="version-list">
        {loading ? (
          <div className="ai-loading">
            <div className="spinner"></div>
            <p>Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <p className="ai-hint">No saved versions yet. Save your file to create a version.</p>
        ) : (
          versions.map((v) => (
            <div key={v._id} className="version-item">
              <div className="version-item-header">
                <div>
                  <span className="version-time">{formatTime(v.createdAt)}</span>
                  {v.author?.username && (
                    <span className="version-author"> by {v.author.username}</span>
                  )}
                </div>
                <div className="version-actions">
                  <button
                    className="btn-outline btn-sm"
                    onClick={() => togglePreview(v)}
                  >
                    {previewContent === v._id ? "Hide" : "Preview"}
                  </button>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => handleRestore(v._id)}
                  >
                    Restore
                  </button>
                </div>
              </div>
              {v.label && <span className="version-label">{v.label}</span>}
              {previewContent === v._id && (
                <pre className="version-preview">{v.content}</pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default VersionHistory;
