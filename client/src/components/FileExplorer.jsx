import React, { useState } from "react";
import toast from "react-hot-toast";

function FileExplorer({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      toast.error("File name is required");
      return;
    }
    onCreateFile(newFileName.trim());
    setNewFileName("");
    setIsCreating(false);
  };

  const handleRename = (id) => {
    if (!renameValue.trim()) return;
    onRenameFile(id, renameValue.trim());
    setRenamingId(null);
    setRenameValue("");
  };

  const getFileIcon = (name) => {
    const ext = name.split(".").pop().toLowerCase();
    const icons = {
      js: "📜",
      jsx: "⚛️",
      py: "🐍",
      java: "☕",
      cpp: "⚙️",
      c: "⚙️",
      html: "🌐",
      css: "🎨",
      json: "📋",
      md: "📝",
      rb: "💎",
      go: "🔷",
      rs: "🦀",
      ts: "🔷",
      tsx: "⚛️",
    };
    return icons[ext] || "📄";
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <span>Files</span>
        <button
          className="file-add-btn"
          onClick={() => setIsCreating(!isCreating)}
          title="New File"
        >
          +
        </button>
      </div>

      {isCreating && (
        <form className="file-create-form" onSubmit={handleCreate}>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.js"
            autoFocus
          />
        </form>
      )}

      <div className="file-list">
        {files.map((file) => (
          <div
            key={file._id || file.id}
            className={`file-item ${
              activeFileId === (file._id || file.id) ? "active" : ""
            }`}
            onClick={() => onSelectFile(file._id || file.id)}
          >
            {renamingId === (file._id || file.id) ? (
              <input
                type="text"
                className="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename(file._id || file.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(file._id || file.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="file-icon">{getFileIcon(file.name)}</span>
                <span className="file-name">{file.name}</span>
                <div className="file-actions">
                  <button
                    className="file-action-btn"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(file._id || file.id);
                      setRenameValue(file.name);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    className="file-action-btn"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${file.name}?`)) {
                        onDeleteFile(file._id || file.id);
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileExplorer;
