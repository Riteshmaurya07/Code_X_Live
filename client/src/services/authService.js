import api from "./api";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
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

// ── Firebase OAuth with account linking ──

/**
 * Maps a Firebase sign-in provider ID to a credential provider and label.
 */
const PROVIDER_MAP = {
  "google.com":  { provider: googleProvider, label: "Google",  CredClass: GoogleAuthProvider },
  "github.com":  { provider: githubProvider, label: "GitHub",  CredClass: GithubAuthProvider },
};

/**
 * Checks for a pending redirect result on page load.
 * This completes the OAuth flow when signInWithRedirect was used
 * (e.g. because the popup was blocked).
 *
 * Returns the backend user data if a redirect result is found, or null.
 */
export const checkRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const idToken = await result.user.getIdToken();
      const { data } = await api.post("/api/auth/firebase", { idToken });
      return data;
    }
  } catch (error) {
    console.error("Redirect result error:", error);
    // If the redirect itself had an account-linking error, surface it
    if (error.code === "auth/account-exists-with-different-credential") {
      throw error;
    }
  }
  return null;
};

/**
 * Core OAuth flow.
 *
 * 1. Try signInWithPopup.
 * 2. If popup is blocked, fall back to signInWithRedirect.
 * 3. If Firebase throws `account-exists-with-different-credential`:
 *    a. Infer the existing provider (since fetchSignInMethodsForEmail
 *       may return [] due to email enumeration protection).
 *    b. Sign in with the EXISTING provider.
 *    c. Link the NEW credential to the existing account.
 *    d. The user now has both providers on one Firebase account.
 * 4. Send the Firebase ID token to the backend.
 */
const firebaseOAuthLogin = async (provider) => {
  let result;

  try {
    result = await signInWithPopup(auth, provider);
  } catch (error) {
    // ── Popup blocked → fall back to redirect ──
    if (error.code === "auth/popup-blocked") {
      // signInWithRedirect will navigate away; the result is picked up
      // on return via checkRedirectResult() (called in useAuth / App init).
      await signInWithRedirect(auth, provider);
      // This line is never reached (page navigates away), but just in case:
      return null;
    }

    // ── Account linking: same email, different provider ──
    if (error.code === "auth/account-exists-with-different-credential") {
      const email = error.customData?.email;
      const pendingCred = GithubAuthProvider.credentialFromError(error)
        || GoogleAuthProvider.credentialFromError(error);

      if (!email || !pendingCred) throw error;

      // Determine the existing provider.
      // fetchSignInMethodsForEmail may return [] due to Firebase's
      // email enumeration protection (enabled by default since Sep 2023).
      // So we also infer the existing provider from which provider was
      // attempted: if GitHub failed, the existing one is likely Google,
      // and vice versa.
      let existingProviderId = null;

      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.includes("google.com"))  existingProviderId = "google.com";
      else if (methods.includes("github.com"))  existingProviderId = "github.com";

      // Fallback: infer from which provider was attempted
      if (!existingProviderId) {
        if (provider instanceof GithubAuthProvider) {
          existingProviderId = "google.com";   // GitHub failed → existing is Google
        } else if (provider instanceof GoogleAuthProvider) {
          existingProviderId = "github.com";   // Google failed → existing is GitHub
        }
      }

      if (!existingProviderId || !PROVIDER_MAP[existingProviderId]) {
        throw new Error(
          `The email "${email}" is already registered with another sign-in method. ` +
          `Please sign in with your original method first.`
        );
      }

      const { provider: existingProvider, label } = PROVIDER_MAP[existingProviderId];

      // Ask user to sign in with the existing provider to link accounts
      const confirmLink = window.confirm(
        `The email "${email}" is already registered with ${label}. ` +
        `Would you like to sign in with ${label} now to link both accounts?`
      );

      if (!confirmLink) {
        throw new Error("Account linking cancelled.");
      }

      // Sign in with the existing provider
      const existingResult = await signInWithPopup(auth, existingProvider);

      // Link the pending (new) credential to the existing account
      await linkWithCredential(existingResult.user, pendingCred);

      result = existingResult;
    } else {
      throw error;
    }
  }

  // Get the Firebase ID token and send to our backend
  const idToken = await result.user.getIdToken();
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
