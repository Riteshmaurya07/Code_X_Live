import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { resetPassword } from "../services/authService";
import AuthLayout from "../components/layout/AuthLayout";
import toast from "react-hot-toast";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setIsLoading(true);
    try {
      const data = await resetPassword(token, password);
      toast.success(data.message);
      setIsSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid or expired token");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-header-modern">
        <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
        <p className="text-sm text-gray-400 mb-8">
          Strong passwords help protect your account.
        </p>
      </div>

      {!isSuccess ? (
        <form onSubmit={handleSubmit} className="auth-form-modern">
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="password">New Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={18} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
            <label className="auth-label" htmlFor="confirmPassword">Confirm New Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={18} />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      ) : (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 text-green-500 rounded-full mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Password Updated</h3>
          <p className="text-gray-400 mb-8">
            Your password has been reset successfully. You can now use your new password to log in.
          </p>
          <button 
            onClick={() => navigate("/login")}
            className="auth-submit-btn"
          >
            Go to Login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

export default ResetPassword;
