import React from 'react';
import Button from '../ui/Button';
import { useNavigate } from 'react-router-dom';

/**
 * Individual project card showing meta info and actions
 */
const ProjectCard = ({ project, onOpen, onShare, onDelete }) => {
  const navigate = useNavigate();

  return (
    <div className="project-card">
      <div className="project-card-header">
        <h3>{project.name}</h3>
        <span className="lang-badge">{project.language}</span>
      </div>
      <div className="project-card-meta">
        <span>
          Updated{" "}
          {new Date(project.updatedAt).toLocaleDateString()}
        </span>
        {project.collaborators?.length > 0 && (
          <div className="collaborators-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            <span style={{ color: "var(--text-muted)" }}>Collaborators:</span>
            {project.collaborators.map((c, idx) => (
              c.user && c.user.username ? (
                <span 
                  key={c.user._id || idx}
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${c.user.username}`); }}
                  style={{ color: "var(--primary)", cursor: "pointer", fontSize: "0.85rem", background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}
                >
                  @{c.user.username}
                </span>
              ) : null
            ))}
          </div>
        )}
      </div>
      <div className="project-card-actions">
        <Button
          size="sm"
          onClick={() => onOpen(project)}
        >
          Open
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onShare(project._id)}
        >
          Share
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => onDelete(project._id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
};

export default ProjectCard;
