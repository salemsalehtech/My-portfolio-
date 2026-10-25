// AdminLayout.jsx — the shell every /admin/* page renders inside (see the nested routes in
// App.jsx). Guards the whole admin section: if not logged in (useAdmin().isAuthed is
// false), it redirects to /admin/login instead of rendering anything. Otherwise it renders
// a sidebar (links to each admin page + logout) and <Outlet /> — react-router-dom's
// placeholder for whichever child route is currently active (AdminProjects, AdminSkills,
// etc.).
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";

const LINKS = [
  { to: "/admin/settings", label: "Profile & Links" },
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/skills", label: "Skills" },
  { to: "/admin/youtube", label: "YouTube" },
  { to: "/admin/messages", label: "Messages" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/testimonials", label: "Testimonials" },
  { to: "/admin/about", label: "About" },
  { to: "/admin/cv", label: "CV" },
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
