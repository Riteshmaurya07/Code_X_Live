import React from 'react';
import Logo from '../ui/Logo';

/**
 * Global Footer component
 */
const Footer = () => {
  return (
    <footer className="landing-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <Logo size="sm" className="footer-logo" />
        </div>
        <div className="footer-info">
          <p>Built by <strong>Team CodeX</strong></p>
          <p className="text-muted">UIET Kanpur</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
