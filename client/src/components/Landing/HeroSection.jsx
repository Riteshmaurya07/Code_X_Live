import React from 'react';

/**
 * Main marketing hero section for the landing page
 */
const HeroSection = () => {
  return (
    <section className="landing-hero">
      <span className="hero-eyebrow">Real-Time Collaborative IDE</span>
      <h1 className="hero-title">Code together, <br /> <span className="text-gradient">in real time.</span></h1>
      <p className="hero-subtitle">
        Experience seamless peer-to-peer coding with syntax highlighting, live chat, and intelligent sync. Create a room and invite your team instantly.
      </p>
    </section>
  );
};

export default HeroSection;
