import "./App.css";
import { useEffect } from "react";
import { Routes, Route, Navigate, useParams, useSearchParams, useNavigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import EditorPage from "./components/EditorPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { GlobalSocketProvider } from "./hooks/useGlobalSocket";
import { DMProvider } from "./hooks/useDM";
import toast from "react-hot-toast";
import api from "./services/api";

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
    const currentUrl = window.location.pathname + window.location.search;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(currentUrl)}`} />;
  }

  return children;
}

function JoinHandler() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate(`/editor/${roomId}?token=${token}`, { replace: true });
      return;
    }

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
    <div className="loading-screen">
      <p className="text-[var(--text-muted)]">Joining project...</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/join/:roomId" 
        element={
          <ProtectedRoute>
            <JoinHandler />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/editor/:roomId" 
        element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile/:username" 
        element={
          <ProtectedRoute>
            <PublicProfile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile/:username/followers" 
        element={
          <ProtectedRoute>
            <PublicProfile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile/:username/following" 
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
    <ThemeProvider>
      <AuthProvider>
        <GlobalSocketProvider>
          <DMProvider>
            <div>
              <Toaster position="top-center" />
            </div>
            <AppRoutes />
          </DMProvider>
        </GlobalSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
