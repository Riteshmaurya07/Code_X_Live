import React from 'react';

const ActivityHeatmap = ({ heatmap }) => {
  // Generate days for the last 365 days
  const today = new Date();
  const days = [];
  
  // To align weeks, we start from 366 days ago and adjust to the nearest Sunday
  // or we just go back 371 days (53 weeks) to ensure the grid is full
  for (let i = 370; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = heatmap[dateStr] || 0;
    
    let level = 0;
    if (count > 0) level = 1;
    if (count > 3) level = 2;
    if (count > 6) level = 3;
    if (count > 9) level = 4;

    days.push({
      date: dateStr,
      count,
      level
    });
  }

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <h3>Activity Heatmap</h3>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          {Object.values(heatmap).reduce((a, b) => a + b, 0)} activities in the last year
        </span>
      </div>
      
      <div className="heatmap-scroll-container">
        <div className="heatmap-grid">
          {days.map((day, index) => (
            <div 
              key={index} 
              className={`heatmap-cell level-${day.level}`}
              title={`${day.count} activities on ${day.date}`}
            />
          ))}
        </div>
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        <div className="heatmap-cell level-0"></div>
        <div className="heatmap-cell level-1"></div>
        <div className="heatmap-cell level-2"></div>
        <div className="heatmap-cell level-3"></div>
        <div className="heatmap-cell level-4"></div>
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
