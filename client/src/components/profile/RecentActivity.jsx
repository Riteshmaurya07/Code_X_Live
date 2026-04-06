import React from 'react';

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
    case 'project_created': return '🚀';
    case 'file_created': return '📄';
    case 'file_saved': return '💾';
    case 'user_followed': return '👤';
    case 'user_login': return '🔑';
    case 'invitation_received': return '✉️';
    default: return '⚡';
  }
};

const formatActionText = (action, details) => {
  const text = action.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const RecentActivity = ({ activities }) => {
  return (
    <div className="activity-timeline">
      <h3>Recent Activity</h3>
      {activities.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem' }}>
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
  );
};

export default RecentActivity;
