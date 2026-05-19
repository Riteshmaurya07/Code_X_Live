import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { loginUser, loginWithGoogle, loginWithGitHub } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "../components/layout/AuthLayout";
import toast from "react-hot-toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("All fields are required");
      return;
    }

    setIsLoading(true);
    try {
      const userData = await loginUser(email, password);
      login(userData);
      toast.success("Login successful!");
      
      const returnUrl = searchParams.get("returnUrl") || "/dashboard";
      navigate(returnUrl);
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    try {
      const userData = provider === "google" ? await loginWithGoogle() : await loginWithGitHub();
      
      // null means signInWithRedirect was used (popup blocked) — page will navigate away
      if (!userData) return;

      login(userData);
      toast.success("Login successful!");
      const returnUrl = searchParams.get("returnUrl") || "/dashboard";
      navigate(returnUrl);
    } catch (err) {
      console.error("Social login error:", err);
      
      // Don't show a toast for user-cancelled actions
      if (err.message === "Account linking cancelled." ||
          err.code === "auth/popup-closed-by-user" ||
          err.code === "auth/cancelled-popup-request") {
        setIsLoading(false);
        return;
      }

      const message =
        err.response?.data?.error ||
        err.message ||
        err.code?.replace("auth/", "").replace(/-/g, " ") ||
        "Social login failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleLogin} className="auth-form-modern">
        <div className="auth-form-group">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="email">Email</label>
          </div>
          <div className="auth-input-wrapper">
            <Mail className="auth-input-icon" size={18} />
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@codex.live"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="auth-form-group">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="forgot-link">Forgot?</Link>
          </div>
          <div className="auth-input-wrapper">
            <Lock className="auth-input-icon" size={18} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="auth-divider-modern">or continue with</div>

      <div className="social-btns-modern">
        <button
          className="social-btn-modern"
          onClick={() => handleSocialLogin("google")}
          disabled={isLoading}
          type="button"
        >
          <span className="flex items-center justify-center w-5 h-5 bg-white text-[#4285F4] rounded-sm font-bold text-xs">G</span>
          Google
        </button>
        <button
          className="social-btn-modern"
          onClick={() => handleSocialLogin("github")}
          disabled={isLoading}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
          GitHub
        </button>
      </div>

      <div className="auth-terms">
        By signing in, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
      </div>
    </AuthLayout>
  );
}

export default Login;
