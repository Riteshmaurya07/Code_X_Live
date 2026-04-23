import React from 'react';
import Logo from '../ui/Logo';

/**
 * Global Footer component
 */
const Footer = () => {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)] py-12 px-[5%] mt-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="footer-brand">
          <Logo size="sm" />
        </div>
        <div className="text-center md:text-right">
          <p className="text-[var(--text-secondary)] font-medium mb-1">Built by <span className="text-[var(--text-primary)]">Team CodeX</span></p>
          <p className="text-[var(--text-secondary)] text-sm mb-3">UIET Kanpur</p>
          <a 
            href="https://github.com/Riteshmaurya07/Code_X_Live" 
            target="_blank" 
            rel="noreferrer" 
            className="text-sm text-[var(--accent)] hover:underline flex items-center gap-2 justify-center md:justify-end"
          >
            GitHub Repository
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
