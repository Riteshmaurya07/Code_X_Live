import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { registerUser, loginWithGoogle, loginWithGitHub } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "../components/layout/AuthLayout";
import toast from "react-hot-toast";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !email || !password || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const userData = await registerUser(username, email, password);
      login(userData);
      toast.success("Account created successfully!");

      const returnUrl = searchParams.get("returnUrl") || "/dashboard";
      navigate(returnUrl);
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    try {
      const userData = provider === "google" ? await loginWithGoogle() : await loginWithGitHub();
      login(userData);
      toast.success("Login successful!");
      const returnUrl = searchParams.get("returnUrl") || "/dashboard";
      navigate(returnUrl);
    } catch (err) {
      toast.error(err.response?.data?.error || "Social login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleRegister} className="auth-form-modern">
        <div className="auth-form-group">
          <label className="auth-label" htmlFor="username">Username</label>
          <div className="auth-input-wrapper">
            <User className="auth-input-icon" size={18} />
            <input
              id="username"
              type="text"
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="auth-form-group">
          <label className="auth-label" htmlFor="email">Email</label>
          <div className="auth-input-wrapper">
            <Mail className="auth-input-icon" size={18} />
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="auth-form-group">
          <label className="auth-label" htmlFor="password">Password</label>
          <div className="auth-input-wrapper">
            <Lock className="auth-input-icon" size={18} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
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

        <div className="auth-form-group">
          <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
          <div className="auth-input-wrapper">
            <Lock className="auth-input-icon" size={18} />
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Create Account"}
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
        By creating an account, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
      </div>
    </AuthLayout>
  );
}

export default Register;
