// AdminLayout.jsx — the shell every /admin/* page renders inside (see the nested routes in
// App.jsx). Guards the whole admin section: if not logged in (useAdmin().isAuthed is false), it
// redirects to /admin/login, remembering the page.
//
// Layout: a sidebar menu grouped by purpose (with icons) + a top bar (team notifications 🔔,
// View site, light / dark theme, English / Arabic) + <Outlet /> — react-router-dom's placeholder
// for the active page — and the <Toaster /> for short messages (components/Toaster.jsx).
// On phones the sidebar becomes a drawer opened from the ☰ button and closed after choosing a page.
// The dashboard language (lib/adminI18n.jsx) also flips the whole layout to right-to-left.
import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import Toaster from "../../components/Toaster";
import { useAdmin } from "../../context/AdminContext";
import { useSite } from "../../context/SiteContext";
import { useAdminT } from "../../lib/adminI18n";
import { COMPANY } from "../../lib/brand";
import { loadRules } from "../../lib/rules";
import { api } from "../../lib/api";
import { NAV_ICONS } from "../../components/admin/navIcons";
import Bell from "../../components/team/Bell";
import NotificationBell from "../../components/NotificationBell";
import BrandMark from "../../components/BrandMark";

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
      { to: "/admin/products", label: "Products", icon: "products" },
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
  {
    title: "Work",
    links: [
      { to: "/admin/team", label: "Team", icon: "team" },
      { to: "/admin/circles", label: "Savings circles", icon: "circles" },
    ],
  },
];

// The owner's savings-circle notifications: their wording and where a click leads.
const CIRCLE_NOTES = {
  submitted: "{a} sent a payment: {d}", received: "{a} confirmed receiving their turn: {d}", request: "{a} asked for an early turn: {d}",
  signup: "{a} signed up — approve the account", waitlist: "{a} wants to join the next circle",
};
const CIRCLE_NOTE_LINK = { submitted: "/admin/circles?tab=inbox", request: "/admin/circles?tab=inbox", signup: "/admin/circles?tab=members", waitlist: "/admin/circles?tab=members" };

export default function AdminLayout() {
  const { isAuthed, logout } = useAdmin();
  const { theme, toggleTheme } = useSite();
  const { t, lang, setLang, dir } = useAdminT();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]); // close the phone drawer after navigating
  useEffect(() => { document.title = `${t("Dashboard")} · ${COMPANY}`; }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadRules(); }, []); // upload limits shown and checked on the pages (lib/rules.js)

  // Remember the page, so after signing in the admin goes straight back to it.
  if (!isAuthed) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  return (
    <div className={`admin-page admin-shell ${menuOpen ? "is-menu-open" : ""}`} dir={dir} lang={lang}>
      <aside className="admin-sidebar" aria-label={t("Menu")}>
        <div className="admin-sidebar-head">
          <Link to="/" className="admin-brand">
            <BrandMark height={24} className="tm-logo" />
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
        {/* Ends every session (lost phone, shared computer): all tokens issued so far stop working. */}
        <button className="admin-nav-link admin-logout is-all" onClick={async () => {
          if (!confirm(t("Sign out on every device, including this one?"))) return;
          await api.post("/auth/logout-all").catch(() => {});
          logout();
        }}>{NAV_ICONS.logout}<span>{t("Sign out everywhere")}</span></button>
      </aside>
      <div className="admin-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <div className="admin-body">
        <header className="admin-topbar">
          <button type="button" className="admin-icon-btn admin-only-mobile" onClick={() => setMenuOpen(true)} aria-label={t("Open menu")}>{NAV_ICONS.menu}</button>
          <Link to="/" className="admin-brand admin-only-mobile"><BrandMark height={24} className="tm-logo" /></Link>
          <div className="admin-topbar-actions">
            <Bell base="/admin/team" lang={lang} link={bellLink} className="is-admin" />
            <NotificationBell path="/admin/circles/notifications/all" readPath="/admin/circles/notifications/read" lang={lang} className="is-admin"
              icon={NAV_ICONS.circles} title={t("Savings circles")} empty={t("Nothing new.")} remindersTitle={t("To review")}
              reminder={(r) => ({ text: t("{n} payment(s) waiting for your confirmation", { n: r.count }), tone: "today", to: "/admin/circles?tab=inbox" })}
              note={(n) => ({ text: t(CIRCLE_NOTES[n.kind] || n.kind, { a: n.actor, d: n.detail }), to: CIRCLE_NOTE_LINK[n.kind] || (n.circle ? `/admin/circles/${n.circle}` : "/admin/circles") })} />
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
          <Toaster />
        </main>
      </div>
    </div>
  );
}
