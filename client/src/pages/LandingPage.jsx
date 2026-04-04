import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const LANGUAGES = ["JavaScript", "Python", "TypeScript", "Go", "Rust", "Java"];

function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Create Room State
  const [createUsername, setCreateUsername] = useState(user?.username || "");
  const [createRoomName, setCreateRoomName] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("JavaScript");

  // Join Room State
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinUsername, setJoinUsername] = useState(user?.username || "");

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!createUsername) {
      toast.error("Username is required to create a room.");
      return;
    }
    const newRoomId = uuid();
    // Navigate to editor with state
    navigate(`/editor/${newRoomId}`, {
      state: { 
        username: createUsername, 
        language: selectedLanguage.toLowerCase().replace("javascript", "nodejs"), // Simple normalization for editor support if needed
        projectName: createRoomName || "Untitled Project" 
      },
    });
    toast.success("Room created successfully!");
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinRoomId || !joinUsername) {
      toast.error("Room ID and Username are required.");
      return;
    }
    navigate(`/editor/${joinRoomId}`, {
      state: { username: joinUsername },
    });
    toast.success("Joined room successfully!");
  };

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <img src="/images/codeXlive.png" alt="CodeX Live" />
        </div>
        <div className="landing-nav-links">
          <a href="#" className="nav-link">Docs</a>
          <a href="https://github.com/Riteshmaurya07/Code_X_Live" target="_blank" rel="noreferrer" className="nav-link">
            GitHub
          </a>
          {user ? (
            <Link to="/dashboard" className="btn-primary btn-sm">Dashboard</Link>
          ) : (
            <Link to="/login" className="btn-outline btn-sm">Sign In</Link>
          )}
        </div>
      </nav>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-hero">
          <span className="hero-eyebrow">Real-Time Collaborative IDE</span>
          <h1 className="hero-title">Code together, <br /> <span className="text-gradient">in real time.</span></h1>
          <p className="hero-subtitle">
            Experience seamless peer-to-peer coding with syntax highlighting, live chat, and intelligent sync. Create a room and invite your team instantly.
          </p>
        </section>

        {/* Action Grids */}
        <section className="landing-actions-grid">
          {/* Create Room Card */}
          <div className="landing-card create-card">
            <div className="card-badge">Start Fresh</div>
            <h2>Create New Room</h2>
            <form onSubmit={handleCreateRoom} className="landing-form">
              <div className="form-group">
                <label>Your Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Alex" 
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Room Name (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. React Bugfix Session" 
                  value={createRoomName}
                  onChange={(e) => setCreateRoomName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Language</label>
                <div className="language-pills">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={`lang-pill ${selectedLanguage === lang ? "active" : ""}`}
                      onClick={() => setSelectedLanguage(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary full-width mt-4">
                Create Room
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="landing-card join-card">
            <div className="card-badge join-badge">Collaboration</div>
            <h2>Join Existing Room</h2>
            <form onSubmit={handleJoinRoom} className="landing-form mt-4">
              <div className="form-group">
                <label>Your Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Alex" 
                  value={joinUsername}
                  onChange={(e) => setJoinUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Room ID</label>
                <input 
                  type="text" 
                  placeholder="Paste Room ID here" 
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-success full-width mt-auto">
                Join Room
              </button>
            </form>
          </div>
        </section>

        {/* Features Highlights */}
        <section className="landing-features">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-Time Code Sync</h3>
            <p>Every keystroke synchronizes instantly across all connected clients via highly optimized WebSockets.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Role-Based Permissions</h3>
            <p>Control who can edit and who can only view. Kick misbehaving users with total admin room authority.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>Live Room Chat</h3>
            <p>Built-in slide panel chat supporting global room broadcasts and private zoom-style direct messaging.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📁</div>
            <h3>Shared File Tree</h3>
            <p>Collaborate on multiple files seamlessly. Create, rename, delete, and switch contexts in real-time.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src="/images/codeXlive.png" alt="CodeX Live" className="footer-logo" />
          </div>
          <div className="footer-info">
            <p>Built by <strong>Ritesh Maurya</strong></p>
            <p className="text-muted">UIET Kanpur</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
