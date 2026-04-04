import React from 'react';

const FEATURES = [
  {
    icon: "⚡",
    title: "Real-Time Code Sync",
    desc: "Every keystroke synchronizes instantly across all connected clients via highly optimized WebSockets."
  },
  {
    icon: "🛡️",
    title: "Role-Based Permissions",
    desc: "Control who can edit and who can only view. Kick misbehaving users with total admin room authority."
  },
  {
    icon: "💬",
    title: "Live Room Chat",
    desc: "Built-in slide panel chat supporting global room broadcasts and private zoom-style direct messaging."
  },
  {
    icon: "📁",
    title: "Shared File Tree",
    desc: "Collaborate on multiple files seamlessly. Create, rename, delete, and switch contexts in real-time."
  }
];

/**
 * Grid of product feature highlights
 */
const FeatureGrid = () => {
  return (
    <section className="landing-features">
      {FEATURES.map((feature, index) => (
        <div key={index} className="feature-card">
          <div className="feature-icon">{feature.icon}</div>
          <h3>{feature.title}</h3>
          <p>{feature.desc}</p>
        </div>
      ))}
    </section>
  );
};

export default FeatureGrid;
