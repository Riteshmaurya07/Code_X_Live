import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { forgotPassword } from "../services/authService";
import AuthLayout from "../components/layout/AuthLayout";
import toast from "react-hot-toast";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");

    setIsLoading(true);
    try {
      const data = await forgotPassword(email);
      toast.success(data.message);
      setIsSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-header-modern">
        <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
        <p className="text-sm text-gray-400 mb-8">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      {!isSent ? (
        <form onSubmit={handleSubmit} className="auth-form-modern">
          <div className="auth-form-group">
            <label className="auth-label" htmlFor="email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" size={18} />
              <input
                id="email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@codex.live"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      ) : (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 text-green-500 rounded-full mb-4">
            <Mail size={32} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Check your email</h3>
          <p className="text-gray-400 mb-8">
            We've sent a password reset link to <br/>
            <strong className="text-white">{email}</strong>
          </p>
          <button 
            onClick={() => setIsSent(false)}
            className="text-[#00D084] hover:underline text-sm font-medium"
          >
            Didn't receive it? Try again
          </button>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-[#00D084] transition-colors">
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
}

export default ForgotPassword;
