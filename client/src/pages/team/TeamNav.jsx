// TeamNav.jsx — the portal's main navigation: Home · My tasks · Projects · Announcements · Me.
// A full-width tab bar under the top bar on desktop and tablets; on phones the same links become
// a bottom bar within thumb reach (CSS only). Counts: open tasks and unread announcements.
import { NavLink } from "react-router-dom";
import { HomeIcon, ListIcon, FolderIcon, MegaphoneIcon, UserIcon } from "../../components/team/icons";
import { useTeam } from "./TeamPortal";
import { useWork } from "./WorkContext";

export default function TeamNav() {
  const { t } = useTeam();
  const { tasks, news } = useWork();
  const open = tasks ? tasks.filter((x) => x.status === "todo" || x.status === "doing").length : 0;
  const items = [
    { to: "/team", end: true, label: t.nav.home, Icon: HomeIcon },
    { to: "/team/tasks", label: t.nav.tasks, Icon: ListIcon, count: open },
    { to: "/team/projects", label: t.nav.projects, Icon: FolderIcon },
    { to: "/team/news", label: t.nav.news, Icon: MegaphoneIcon, count: news.unread, alert: true },
    { to: "/team/me", label: t.nav.me, Icon: UserIcon },
  ];
  return (
    <nav className="tm-nav" aria-label={t.portal}>
      <div className="tm-nav-inner">
        {items.map(({ to, end, label, Icon, count, alert }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `tm-nav-link ${isActive ? "is-active" : ""}`}>
            <Icon size={18} />
            <span className="tm-nav-label">{label}</span>
            {count > 0 && <span className={`tm-nav-count ${alert ? "is-alert" : ""}`}>{count}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
