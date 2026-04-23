import React from 'react';
import { Flame, Calendar, Rocket, Users } from 'lucide-react';

const ProfileStats = ({ stats }) => {
  const statItems = [
    { label: 'Current Streak', value: `${stats.currentStreak} days`, icon: <Flame size={20} className="text-orange-500" /> },
    { label: 'Active Days', value: stats.activeDaysThisMonth, icon: <Calendar size={20} className="text-blue-500" />, sub: 'This month' },
    { label: 'Total Projects', value: stats.totalProjects, icon: <Rocket size={20} className="text-purple-500" /> },
    { label: 'Collaborations', value: stats.joinedCollaborations, icon: <Users size={20} className="text-green-500" /> },
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
