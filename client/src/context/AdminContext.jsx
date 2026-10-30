// AdminContext.jsx — holds whether the admin dashboard user is logged in, app-wide.
//
// Like SiteContext.jsx, this is a React Context set up once in App.jsx (<AdminProvider>)
// and read anywhere via useAdmin(). The admin pages under pages/admin/ (AdminLayout,
// AdminLogin, etc.) are the only consumers — the public portfolio pages never touch this.
//
// The actual login/logout HTTP call goes through lib/api.js, same as every other API call
// in the app. The JWT token itself is persisted in localStorage so a page refresh doesn't
// log the admin out; lib/api.js reads that same "adminToken" key to attach it as a
// Bearer header on authenticated requests.
//
// A token is only valid for 7 days (server/src/routes/auth.js). An expired one is dropped when
// the dashboard opens, every minute while it stays open, and whenever the server answers 401
// (lib/api.js fires "admin-session-expired") — then AdminLayout shows the login page, which
// says the login expired and comes back to the same page after signing in.
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

// True when the token is unreadable or past its expiry date (read from the token itself — the
// middle part of a JWT is base64url JSON with `exp` in seconds).
function isExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// The saved token, or null (an expired one is removed).
function storedToken() {
  const token = localStorage.getItem("adminToken");
  if (token && isExpired(token)) { localStorage.removeItem("adminToken"); return null; }
  return token;
}

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  // Lazy initializer: read any existing token from localStorage once, on first render,
  // so an already-logged-in admin stays logged in after refreshing the page.
  // `expired` = the admin was logged out because the login ran out (the login page says so).
  const [expired, setExpired] = useState(() => Boolean(localStorage.getItem("adminToken")) && !storedToken());
  const [token, setToken] = useState(storedToken);

  useEffect(() => {
    const expire = () => { localStorage.removeItem("adminToken"); setToken(null); setExpired(true); };
    const check = () => { const t = localStorage.getItem("adminToken"); if (t && isExpired(t)) expire(); };
    window.addEventListener("admin-session-expired", expire);
    const timer = setInterval(check, 60 * 1000);
    return () => { window.removeEventListener("admin-session-expired", expire); clearInterval(timer); };
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("adminToken", res.token);
    setToken(res.token);
    setExpired(false);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
    setExpired(false);
  };

  return (
    <AdminContext.Provider value={{ token, login, logout, isAuthed: !!token, expired }}>
      {children}
    </AdminContext.Provider>
  );
}

// Hook used by admin pages to read login state and call login()/logout().
// isAuthed is just `!!token` — true once a token exists, false after logout.
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
