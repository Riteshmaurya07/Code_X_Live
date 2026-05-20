import React from "react";
import { ChevronRight, FileCode, Folder } from "lucide-react";

function Breadcrumbs({ activeFile }) {
  if (!activeFile) return null;

  const pathParts = [];
  if (activeFile.path && activeFile.path !== "/") {
    const parts = activeFile.path.split("/").filter(Boolean);
    pathParts.push(...parts);
  }
  
  if (activeFile.name) {
    pathParts.push(activeFile.name);
  } else {
    pathParts.push("untitled");
  }

  return (
    <div className="editor-breadcrumbs">
      {pathParts.map((part, index) => {
        const isLast = index === pathParts.length - 1;
        return (
          <React.Fragment key={index}>
            <div className={`breadcrumb-item ${isLast ? "active" : ""}`}>
              {isLast ? (
                <FileCode size={14} className="text-accent" />
              ) : (
                <Folder size={14} className="text-muted" />
              )}
              <span>{part}</span>
            </div>
            {!isLast && <ChevronRight size={12} className="text-muted" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default Breadcrumbs;
