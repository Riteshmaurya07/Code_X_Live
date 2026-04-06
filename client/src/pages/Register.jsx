import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { registerUser, loginWithGoogle, loginWithGitHub } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <img
              src="/images/codeXlive.png"
              alt="CodeXLive"
              className="auth-logo"
            />
            <h2>Create Account</h2>
            <p>Join CodeXLive today</p>
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

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                autoComplete="username"
              />
            </div>

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
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
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

export default Register;
