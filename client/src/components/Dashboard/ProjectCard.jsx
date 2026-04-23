import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const ProjectCard = ({ project, onOpen, onShare, onDelete }) => {
  const navigate = useNavigate();

  return (
    <div className="project-card group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--text-primary)] truncate pr-2">{project.name}</h3>
        <Badge variant="info">{project.language}</Badge>
      </div>
      
      <div className="flex flex-col gap-3 mb-6 flex-1">
        <div className="flex items-center text-xs text-[var(--text-muted)]">
          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
        
        {project.collaborators?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {project.collaborators.map((c, idx) =>
              c.user?.username ? (
                <button
                  key={c.user._id || idx}
                  className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors border border-[var(--border)]"
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${c.user.username}`); }}
                >
                  @{c.user.username}
                </button>
              ) : null
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Button size="sm" onClick={() => onOpen(project)} className="flex-1">Open</Button>
        <Button variant="outline" size="sm" onClick={() => onShare(project._id)}>Share</Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(project._id)}>Delete</Button>
      </div>
    </div>
  );
};

export default ProjectCard;
