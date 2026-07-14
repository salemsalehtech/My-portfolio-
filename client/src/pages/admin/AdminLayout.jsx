import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";

const LINKS = [
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/skills", label: "Skills" },
  { to: "/admin/youtube", label: "YouTube" },
  { to: "/admin/messages", label: "Messages" },
];

export default function AdminLayout() {
  const { isAuthed, logout } = useAdmin();

  if (!isAuthed) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin-page admin-shell">
      <aside className="admin-sidebar">
        <h2>Salem Saleh</h2>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
        <button className="admin-nav-link admin-logout" onClick={logout}>Logout</button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
