import { createContext, useContext, useMemo, useState } from "react";

const AUTH_KEY = "complaint_portal_auth";

const defaultState = {
  isAuthenticated: false,
  role: null,
  profile: null,
  customerToken: null
};

const loadStoredAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultState;
    if (parsed.role === "customer" && !parsed.customerToken) {
      return defaultState;
    }
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      role: parsed.role || null,
      profile: parsed.profile || null,
      customerToken: parsed.customerToken || null
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
        profile: { username: u },
        customerToken: null
      });
      return true;
    }
    return false;
  };

  const loginCustomer = ({ name, email, customerToken }) => {
    persist({
      isAuthenticated: true,
      role: "customer",
      profile: { name: String(name || "").trim(), email: String(email || "").trim().toLowerCase() },
      customerToken: String(customerToken || "")
    });
  };

  const logout = () => {
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
