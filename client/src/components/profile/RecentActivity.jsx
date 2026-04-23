import React, { useState } from 'react';
import { Rocket, FileText, Save, User, Key, Mail, Zap, ChevronDown, ChevronUp } from 'lucide-react';

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

const getActionIcon = (action) => {
  switch (action) {
    case 'project_created': return <Rocket size={16} />;
    case 'file_created': return <FileText size={16} />;
    case 'file_saved': return <Save size={16} />;
    case 'user_followed': return <User size={16} />;
    case 'user_login': return <Key size={16} />;
    case 'invitation_received': return <Mail size={16} />;
    default: return <Zap size={16} />;
  }
};

const formatActionText = (action) => {
  const text = action.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const RecentActivity = ({ activities }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="activity-timeline">
      <div 
        className="flex items-center justify-between cursor-pointer group select-none" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="m-0 text-[var(--text-primary)]">Recent Activity</h3>
        <div className="flex items-center gap-2 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
          <span className="text-xs font-medium">{isExpanded ? 'Show less' : `Show ${activities.length} activities`}</span>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      <div className={`mt-4 space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {activities.length === 0 ? (
          <div className="empty-state p-8">
            No recent activity found.
          </div>
        ) : (
          activities.map((item, index) => (
            <div key={index} className="timeline-item">
              <div className="timeline-icon">
                {getActionIcon(item.action)}
              </div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <strong>{formatActionText(item.action)}</strong> - {item.details}
                </div>
                <div className="timeline-time">
                  {timeAgo(item.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
