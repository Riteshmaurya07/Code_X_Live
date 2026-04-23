import React from 'react';
import { MousePointer2, Code2, Share2 } from 'lucide-react';

const STEPS = [
  {
    icon: <MousePointer2 size={32} />,
    title: "1. Create a Space",
    desc: "Start a new room or project in seconds. Choose your preferred language and environment.",
    color: "var(--accent)"
  },
  {
    icon: <Share2 size={32} />,
    title: "2. Invite Your Team",
    desc: "Share your room link or invite registered users directly. Set permissions to control who can edit.",
    color: "#3B82F6"
  },
  {
    icon: <Code2 size={32} />,
    title: "3. Build Together",
    desc: "Write, run, and debug code in real-time. Use built-in chat and AI to accelerate your workflow.",
    color: "#22C55E"
  }
];

const HowItWorks = () => {
  return (
    <section className="section-container border-t border-[var(--border)]">
      <div className="text-center mb-20 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold mb-6 text-[var(--text-primary)]">Simple Workflow</h2>
        <p className="text-[var(--text-secondary)] text-lg max-w-xl">Getting started with CodeXLive is fast and intuitive.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
        {STEPS.map((step, index) => (
          <div key={index} className="flex flex-col items-center text-center group">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg"
              style={{ background: `${step.color}15`, color: step.color, border: `1px solid ${step.color}30` }}
            >
              {step.icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-[var(--text-primary)]">{step.title}</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
