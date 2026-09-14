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
import { createContext, useContext, useState } from "react";
import { api } from "../lib/api";

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  // Lazy initializer: read any existing token from localStorage once, on first render,
  // so an already-logged-in admin stays logged in after refreshing the page.
  const [token, setToken] = useState(() => localStorage.getItem("adminToken"));

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("adminToken", res.token);
    setToken(res.token);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setToken(null);
  };

  return (
    <AdminContext.Provider value={{ token, login, logout, isAuthed: !!token }}>
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
