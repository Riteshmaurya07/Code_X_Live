import React from 'react';

const HeroSection = () => {
  return (
    <section className="section-container landing-hero !pt-24 !pb-12">
      <div className="flex flex-col items-center text-center">
        <span className="hero-eyebrow mb-6">Built for Developers, by Developers</span>
        <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--text-primary)] leading-[1.1] tracking-tight mb-8 max-w-4xl">
          The Ultimate <span className="text-gradient">Collaborative</span> Coding Workspace
        </h1>
        <p className="text-xl md:text-2xl text-[var(--text-secondary)] leading-relaxed mb-12 max-w-2xl">
          CodeXLive brings teams together in a unified, high-performance editor. 
          Experience real-time sync, multi-language execution, and smart AI assistance.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4 opacity-60">
          <div className="flex items-center gap-2 text-sm font-medium border border-[var(--border)] px-4 py-2 rounded-full bg-[var(--bg-secondary)]">
            <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></div>
            Live Real-time Sync
          </div>
          <div className="flex items-center gap-2 text-sm font-medium border border-[var(--border)] px-4 py-2 rounded-full bg-[var(--bg-secondary)]">
            <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse"></div>
            Multi-Language Support
          </div>
          <div className="flex items-center gap-2 text-sm font-medium border border-[var(--border)] px-4 py-2 rounded-full bg-[var(--bg-secondary)]">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse"></div>
            AI Powered IDE
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
