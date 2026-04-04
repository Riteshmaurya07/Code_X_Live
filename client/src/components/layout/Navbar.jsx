import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import Button from '../ui/Button';

/**
 * Global Navbar component supporting different variants
 * @param {Object} props
 * @param {'landing' | 'dashboard' | 'auth'} [props.variant='landing'] - Context variant
 */
const Navbar = ({ variant = 'landing' }) => {
  const { user, logout } = useAuth();

  if (variant === 'dashboard') {
    return (
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <Logo size="sm" className="nav-logo" />
        </div>
        <div className="nav-actions">
          <span className="nav-user">Hi, {user?.username}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </nav>
    );
  }

  // Auth/Landing style
  return (
    <nav className="landing-nav">
      <div className="landing-logo">
         <Logo size="sm" />
      </div>
      <div className="landing-nav-links">
        <a href="#" className="nav-link">Docs</a>
        <a href="https://github.com/Riteshmaurya07/Code_X_Live" target="_blank" rel="noreferrer" className="nav-link">
          GitHub
        </a>
        {user ? (
          <Link to="/dashboard">
            <Button size="sm">Dashboard</Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
