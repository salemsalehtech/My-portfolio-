// AdminLayout.jsx — the shell every /admin/* page renders inside (see the nested routes in
// App.jsx). Guards the whole admin section: if not logged in (useAdmin().isAuthed is false), it
// redirects to /admin/login, remembering the page.
//
// Layout: a sidebar menu grouped by purpose (with icons) + a top bar (team notifications 🔔,
// View site, light / dark theme, English / Arabic) + <Outlet /> — react-router-dom's placeholder for the active page.
// On phones the sidebar becomes a drawer opened from the ☰ button and closed after choosing a page.
// The dashboard language (lib/adminI18n.jsx) also flips the whole layout to right-to-left.
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useSite } from "../../context/SiteContext";
import { useAdminT } from "../../lib/adminI18n";
import { COMPANY } from "../../lib/brand";
import { NAV_ICONS } from "../../components/admin/navIcons";
import Bell from "../../components/team/Bell";

// Where a click on a notification 🔔 leads: the task in its project, today's standups, or the
// members list (a new sign-up to approve).
const bellLink = ({ project, task, kind }) =>
  kind === "blocker" ? "/admin/team?tab=standups"
    : kind === "signup" ? "/admin/team?tab=members"
    : project && task ? `/admin/team/projects/${project}?task=${task}` : null;

const GROUPS = [
  { title: "Insights", links: [{ to: "/admin/analytics", label: "Analytics", icon: "analytics" }] },
  {
    title: "Website content",
    links: [
      { to: "/admin/settings", label: "Profile & Links", icon: "settings" },
      { to: "/admin/about", label: "About", icon: "about" },
      { to: "/admin/projects", label: "Projects", icon: "projects" },
      { to: "/admin/skills", label: "Skills", icon: "skills" },
      { to: "/admin/services", label: "Services", icon: "services" },
      { to: "/admin/certificates", label: "Certificates", icon: "certificates" },
      { to: "/admin/courses", label: "Courses", icon: "courses" },
      { to: "/admin/youtube", label: "YouTube", icon: "youtube" },
      { to: "/admin/cv", label: "CV", icon: "cv" },
    ],
  },
  {
    title: "Publishing",
    links: [
      { to: "/admin/posts", label: "Blog", icon: "posts" },
      { to: "/admin/testimonials", label: "Testimonials", icon: "testimonials" },
    ],
  },
  {
    title: "Inbox",
    links: [
      { to: "/admin/messages", label: "Messages", icon: "messages" },
      { to: "/admin/forms", label: "Forms", icon: "forms" },
    ],
  },
  { title: "Work", links: [{ to: "/admin/team", label: "Team", icon: "team" }] },
];

export default function AdminLayout() {
  const { isAuthed, logout } = useAdmin();
  const { theme, toggleTheme } = useSite();
  const { t, lang, setLang, dir } = useAdminT();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]); // close the phone drawer after navigating
  useEffect(() => { document.title = `${t("Dashboard")} · ${COMPANY}`; }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remember the page, so after signing in the admin goes straight back to it.
  if (!isAuthed) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  return (
    <div className={`admin-page admin-shell ${menuOpen ? "is-menu-open" : ""}`} dir={dir} lang={lang}>
      <aside className="admin-sidebar" aria-label={t("Menu")}>
        <div className="admin-sidebar-head">
          <Link to="/" className="admin-brand">
            <span className="tm-logo">SS</span>
            <span><strong>{COMPANY}</strong><small>{t("Dashboard")}</small></span>
          </Link>
          <button type="button" className="admin-icon-btn admin-only-mobile" onClick={() => setMenuOpen(false)} aria-label={t("Close menu")}>{NAV_ICONS.close}</button>
        </div>
        <nav className="admin-nav">
          {GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.title}>
              <span className="admin-nav-title">{t(group.title)}</span>
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}>
                  {NAV_ICONS[link.icon]}<span>{t(link.label)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <button className="admin-nav-link admin-logout" onClick={logout}>{NAV_ICONS.logout}<span>{t("Logout")}</span></button>
      </aside>
      <div className="admin-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <div className="admin-body">
        <header className="admin-topbar">
          <button type="button" className="admin-icon-btn admin-only-mobile" onClick={() => setMenuOpen(true)} aria-label={t("Open menu")}>{NAV_ICONS.menu}</button>
          <Link to="/" className="admin-brand admin-only-mobile"><span className="tm-logo">SS</span></Link>
          <div className="admin-topbar-actions">
            <Bell base="/admin/team" lang={lang} link={bellLink} className="is-admin" />
            <a className="admin-icon-btn admin-view-site" href="#/" target="_blank" rel="noreferrer" title={t("View site")}>{NAV_ICONS.external}<span>{t("View site")}</span></a>
            <button type="button" className="admin-icon-btn" onClick={toggleTheme} title={theme === "dark" ? t("Light mode") : t("Dark mode")} aria-label={theme === "dark" ? t("Light mode") : t("Dark mode")}>
              {theme === "dark" ? NAV_ICONS.sun : NAV_ICONS.moon}
            </button>
            <button type="button" className="admin-icon-btn admin-lang-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")} lang={lang === "ar" ? "en" : "ar"}>
              {NAV_ICONS.globe}<span>{lang === "ar" ? "English" : "عربي"}</span>
            </button>
          </div>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
