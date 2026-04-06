import React from 'react';

const ProfileStats = ({ stats }) => {
  const statItems = [
    { label: 'Current Streak', value: `${stats.currentStreak} days`, icon: '🔥' },
    { label: 'Active Days', value: stats.activeDaysThisMonth, icon: '📅', sub: 'This month' },
    { label: 'Total Projects', value: stats.totalProjects, icon: '🚀' },
    { label: 'Collaborations', value: stats.joinedCollaborations, icon: '🤝' },
  ];

  return (
    <div className="stats-grid">
      {statItems.map((item, index) => (
        <div key={index} className="stat-card">
          <div className="stat-card-icon">{item.icon}</div>
          <div className="stat-card-info">
            <h4>{item.label}</h4>
            <div className="stat-card-value">{item.value}</div>
            {item.sub && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
