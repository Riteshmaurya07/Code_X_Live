import React from "react";
import { ChevronRight, FileCode, Folder } from "lucide-react";

function Breadcrumbs({ activeFile }) {
  if (!activeFile) return null;

  // For now, we'll just show the file name. 
  // If we had a full path from the file tree, we could split it.
  const pathParts = activeFile.name ? [activeFile.name] : ["untitled"];

  return (
    <div className="editor-breadcrumbs">
      <div className="breadcrumb-item">
        <Folder size={14} className="text-muted" />
        <span>src</span>
      </div>
      <ChevronRight size={12} className="text-muted" />
      {pathParts.map((part, index) => (
        <React.Fragment key={index}>
          <div className="breadcrumb-item active">
            <FileCode size={14} className="text-accent" />
            <span>{part}</span>
          </div>
          {index < pathParts.length - 1 && <ChevronRight size={12} className="text-muted" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default Breadcrumbs;
