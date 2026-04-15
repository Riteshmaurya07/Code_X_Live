import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import Button from '../ui/Button';
import { searchUsers } from '../../services/userService';
import NotificationDropdown from './NotificationDropdown';
import DirectMessaging from './DirectMessaging';

const Navbar = ({ variant = 'landing' }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 1) {
        setIsSearching(true);
        try {
          const results = await searchUsers(searchQuery);
          setSearchResults(results);
          setShowDropdown(true);
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const ThemeToggle = () => (
    <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );

  if (variant === 'dashboard') {
    return (
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size="sm" className="nav-logo" />
          </Link>
        </div>
        <div className="nav-actions">
          <div className="nav-search-container" ref={searchRef}>
            <input 
              type="text" 
              placeholder="Search users..." 
              className="nav-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
            />
            {showDropdown && (
              <div className="nav-search-dropdown">
                {isSearching ? (
                  <div className="search-status">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div 
                      key={result._id} 
                      className="search-result-item"
                      onClick={() => {
                        setShowDropdown(false);
                        setSearchQuery('');
                        navigate(`/profile/${result.username}`);
                      }}
                    >
                      <div className="search-avatar">
                        {result.avatar ? <img src={result.avatar} alt={result.username} /> : <span>{result.username.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="search-info">
                        <span className="search-fullname">{result.fullName || result.username}</span>
                        <span className="search-username">@{result.username}</span>
                      </div>
                    </div>
                  ))
                ) : searchQuery.trim().length > 1 ? (
                  <div className="search-status">No users found</div>
                ) : null}
              </div>
            )}
          </div>
          <DirectMessaging />
          <NotificationDropdown />
          <ThemeToggle />
          <Link to={`/profile/${user?.username}`} className="nav-profile-link">
            <span className="nav-user">Hi, {user?.username}</span>
          </Link>
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="landing-nav">
      <div className="landing-logo">
         <Link to="/" style={{ textDecoration: 'none' }}>
           <Logo size="sm" />
         </Link>
      </div>
      <div className="landing-nav-links">
        <ThemeToggle />
        <a href="#" className="nav-link">Docs</a>
        {user ? (
          <>
            <DirectMessaging />
            <NotificationDropdown />
            <Link to={`/profile/${user.username}`} className="nav-profile-link">Profile</Link>
            <Link to="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          </>
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
