import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios";

const AUTH_KEY = "complaint_portal_auth";

const defaultState = {
  isAuthenticated: false,
  role: null,
  profile: null
};

const loadStoredAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultState;
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      role: parsed.role || null,
      profile: parsed.profile || null
    };
  } catch {
    return defaultState;
  }
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(loadStoredAuth);

  const persist = (next) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    setAuth(next);
  };

  const loginAdmin = (username, password) => {
    const u = String(username || "").trim();
    const p = String(password || "");
    if (u === "admin" && p === "admin123") {
      persist({
        isAuthenticated: true,
        role: "admin",
        profile: { username: u }
      });
      return true;
    }
    return false;
  };

  // Session cookie is set by the server automatically — we only track profile info in localStorage.
  const loginCustomer = ({ name, email }) => {
    persist({
      isAuthenticated: true,
      role: "customer",
      profile: { name: String(name || "").trim(), email: String(email || "").trim().toLowerCase() }
    });
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Best-effort — clear local state even if the server call fails
    }
    localStorage.removeItem(AUTH_KEY);
    setAuth(defaultState);
  };

  const value = useMemo(
    () => ({
      ...auth,
      loginAdmin,
      loginCustomer,
      logout
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
