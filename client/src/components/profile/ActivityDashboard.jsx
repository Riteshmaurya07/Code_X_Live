import React from 'react';
import ProfileStats from './ProfileStats';
import ActivityHeatmap from './ActivityHeatmap';
import RecentActivity from './RecentActivity';
import SuggestedActions from './SuggestedActions';

const ActivityDashboard = ({ data, isOwnProfile }) => {
  if (!data) return <div className="loading-state">Loading dashboard...</div>;

  return (
    <div className="activity-dashboard">
      <ProfileStats stats={data.stats} />
      
      <ActivityHeatmap heatmap={data.heatmap} />
      
      {data.recentActivity && data.recentActivity.length > 0 ? (
        <RecentActivity activities={data.recentActivity} />
      ) : (
        <SuggestedActions isOwnProfile={isOwnProfile} />
      )}
    </div>
  );
};

export default ActivityDashboard;
