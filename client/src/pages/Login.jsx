import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { loginUser, loginWithGoogle, loginWithGitHub } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <img
              src="/images/codeXlive.png"
              alt="CodeXLive"
              className="auth-logo"
            />
            <h2>Welcome Back</h2>
            <p>Sign in to your account</p>
          </div>

          <div className="social-auth">
            <button
              className="social-btn"
              onClick={() => handleSocialLogin("google")}
              disabled={isLoading}
              type="button"
            >
              <span>G</span> Google
            </button>
            <button
              className="social-btn"
              onClick={() => handleSocialLogin("github")}
              disabled={isLoading}
              type="button"
            >
              <span>GH</span> GitHub
            </button>
          </div>

          <div className="auth-divider">or continue with email</div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{" "}
              <Link to="/register">Create one</Link>
            </p>
            <p>
              <Link to="/">← Back to Home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
