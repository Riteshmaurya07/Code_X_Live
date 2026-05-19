import { createContext, useContext, useState, useEffect } from "react";
import { getProfile, checkRedirectResult } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }

      // Check if returning from a signInWithRedirect flow (popup was blocked)
      try {
        const redirectData = await checkRedirectResult();
        if (redirectData) {
          localStorage.setItem("token", redirectData.token);
          localStorage.setItem("user", JSON.stringify(redirectData));
          setUser(redirectData);
        }
      } catch (err) {
        console.error("Redirect auth error:", err);
      }

      setLoading(false);
    };

    init();
  }, []);

  const login = (userData) => {
    localStorage.setItem("token", userData.token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await getProfile();
      const token = localStorage.getItem("token");
      const userData = { ...profile, token };
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
