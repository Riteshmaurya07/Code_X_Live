import React from 'react';
import { 
  Zap, Shield, MessageSquare, Folder, 
  Sparkles, Terminal, History, GitBranch, 
  Users 
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Zap size={24} />,
    title: "Real-Time Sync",
    desc: "Every keystroke synchronizes instantly across all connected clients via highly optimized WebSockets.",
    variant: "primary"
  },
  {
    icon: <Users size={24} />,
    title: "Live Collaboration",
    desc: "Invite multiple developers to your room. See their cursors and edits in real-time as they happen.",
    variant: "info"
  },
  {
    icon: <Sparkles size={24} />,
    title: "AI Code Assistant",
    desc: "Leverage built-in AI to explain complex code, suggest fixes, and generate boilerplates instantly.",
    variant: "warning"
  },
  {
    icon: <Terminal size={24} />,
    title: "Integrated Compiler",
    desc: "Run your code directly in the browser with support for multiple environments and instant output.",
    variant: "success"
  },
  {
    icon: <MessageSquare size={24} />,
    title: "Smart Chat & DMs",
    desc: "Built-in communication panel supporting room-wide discussions and private developer-to-developer messaging.",
    variant: "info"
  },
  {
    icon: <History size={24} />,
    title: "Version History",
    desc: "Automatic versioning of your files. Review changes and restore any previous state with a single click.",
    variant: "warning"
  },
  {
    icon: <Folder size={24} />,
    title: "File Management",
    desc: "VS Code style hierarchical file explorer. Manage folders and files seamlessly in a collaborative space.",
    variant: "primary"
  },
  {
    icon: <GitBranch size={24} />,
    title: "GitHub Integration",
    desc: "Import your public repositories directly from GitHub and start collaborating without leaving the IDE.",
    variant: "success"
  },
  {
    icon: <Shield size={24} />,
    title: "Admin Controls",
    desc: "Complete room authority. Manage user permissions (Owner, Editor, Viewer) and keep your sessions secure.",
    variant: "danger"
  }
];

const FeatureGrid = () => {
  return (
    <section className="section-container border-t border-[var(--border)]">
      <div className="text-center mb-20 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold mb-6 text-[var(--text-primary)]">Built for Modern Teams</h2>
        <p className="text-[var(--text-secondary)] text-lg max-w-2xl leading-relaxed">
          CodeXLive combines the power of a professional IDE with seamless real-time collaboration tools.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURES.map((feature, index) => (
          <div key={index} className="feature-card-premium group text-center items-center">
            <div className={`feature-icon-wrapper variant-${feature.variant}`}>
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
              {feature.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[280px]">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeatureGrid;
