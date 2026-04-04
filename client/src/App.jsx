import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import EditorPage from "./components/EditorPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    // Preserve current URL so user returns here after login
    const currentUrl = window.location.pathname + window.location.search;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(currentUrl)}`} />;
  }

  return children;
}

// Simple redirect for the invite link format /join/:roomId?token=xxx
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import toast from "react-hot-toast";
import api from "./services/api";

function JoinHandler() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  useEffect(() => {
    // If it's a temporary socket invite link (has ?token=)
    if (token) {
      navigate(`/editor/${roomId}?token=${token}`, { replace: true });
      return;
    }

    // Otherwise, it's a permanent project share token from ShareModal
    const redeemShareToken = async () => {
      try {
        const res = await api.post(`/api/sharing/join/${roomId}`);
        if (res.data.success) {
          toast.success(res.data.message || "Joined project successfully!");
          navigate(`/editor/${res.data.projectId}`, { replace: true });
        } else {
          toast.error(res.data.message || "Invalid or expired invite link");
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to join project via invite link");
        navigate("/dashboard", { replace: true });
      }
    };

    redeemShareToken();
  }, [roomId, token, navigate]);

  return (
    <div className="loading-screen" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-muted)" }}>Joining project...</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      {/* Handle invite links */}
      <Route 
        path="/join/:roomId" 
        element={
          <ProtectedRoute>
            <JoinHandler />
          </ProtectedRoute>
        } 
      />
      {/* Protect the editor */}
      <Route 
        path="/editor/:roomId" 
        element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        } 
      />
      {/* Public profile page */}
      <Route 
        path="/profile/:username" 
        element={
          <ProtectedRoute>
            <PublicProfile />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <div>
        <Toaster position="top-center" />
      </div>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
