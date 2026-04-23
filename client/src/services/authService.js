import api from "./api";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "../config/firebaseConfig";

// ── Local auth ──

export const loginUser = async (email, password) => {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data;
};

export const registerUser = async (username, email, password) => {
  const { data } = await api.post("/api/auth/register", {
    username,
    email,
    password,
  });
  return data;
};

export const getProfile = async () => {
  const { data } = await api.get("/api/auth/profile");
  return data;
};

// ── Firebase OAuth ──

const firebaseOAuthLogin = async (provider) => {
  // Sign in with Firebase popup
  const result = await signInWithPopup(auth, provider);
  // Get the Firebase ID token
  const idToken = await result.user.getIdToken();
  // Send to our backend for JWT generation
  const { data } = await api.post("/api/auth/firebase", { idToken });
  return data;
};

export const loginWithGoogle = () => firebaseOAuthLogin(googleProvider);
export const loginWithGitHub = () => firebaseOAuthLogin(githubProvider);

export const forgotPassword = async (email) => {
  const { data } = await api.post("/api/auth/forgot-password", { email });
  return data;
};

export const resetPassword = async (token, password) => {
  const { data } = await api.post(`/api/auth/reset-password/${token}`, {
    password,
  });
  return data;
};
