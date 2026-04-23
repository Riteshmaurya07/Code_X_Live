import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Code2, Brackets, Cpu, Terminal } from 'lucide-react';

const AuthLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="auth-page">
      {/* --- Left Side: Branding & Marketing --- */}
      <div className="auth-branding">
        <div className="auth-branding-header">
          <div className="auth-branding-logo">
             <Code2 className="text-[#00D084]" size={32} />
             <span>CodeX</span>Live
          </div>
        </div>

        {/* Decorative Icons */}
        <div className="branding-icon icon-braces">
          <Brackets size={120} strokeWidth={1} />
        </div>
        <div className="branding-icon icon-code">
          <Terminal size={80} strokeWidth={1} />
        </div>
        <div className="branding-icon icon-chip">
          <Cpu size={100} strokeWidth={1} />
        </div>

        <div className="auth-branding-content">
          <h1>The Kinetic Engine for Modern Teams.</h1>
          <p>
            Experience a living, breathing workspace. Collaborate in real-time, 
            flow through tasks, and build the future together.
          </p>
        </div>

        <div className="auth-branding-footer">
          <div className="status-indicator">
            <div className="status-dot"></div>
            <span>System Operational</span>
          </div>
          <span>V1.2.0 Stable</span>
        </div>
      </div>

      {/* --- Right Side: Auth Card --- */}
      <div className="auth-form-container">
        <div className="auth-card-modern">
          {/* Tabs */}
          <div className="auth-tabs">
            <div 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => navigate('/login')}
            >
              Login
            </div>
            <div 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => navigate('/register')}
            >
              Register
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
