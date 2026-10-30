// Bell.jsx — the notification bell 🔔 in the member portal's top bar and the dashboard's top bar.
//
// Shows a red count of unread notifications (refreshed every minute and when the tab comes back
// into view). Opening it lists due-date reminders first (overdue / today / tomorrow — worked out
// live by the server), then the latest notifications; opening also marks them as read.
// Clicking one opens it: `link({ project, task, kind })` turns it into an address (or null).
// Props: `base` ("/team" for members, "/admin/team" for the owner), `lang`, `link`, `className`.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { SHARED_COPY, formatDue, timeAgo } from "../../lib/team";
import { BellIcon } from "./icons";

const EVERY_MS = 60 * 1000;
// Wraps a name / title in Unicode isolate marks, so English text inside an Arabic sentence
// (or the other way round) keeps its place.
const iso = (text) => `\u2068${text}\u2069`;

export default function Bell({ base, lang = "en", link, className = "" }) {
  const c = SHARED_COPY[lang];
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => new Set()); // ids that were unread when the bell opened
  const ref = useRef(null);

  const load = () => api.get(`${base}/notifications`).then(setData).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, EVERY_MS);
    const onShow = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onShow); };
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && data?.unread) {
      // Keep the "new" highlight while the list is open, but tell the server they're read.
      setSeen(new Set(data.items.filter((n) => !n.read).map((n) => n.id)));
      setData({ ...data, unread: 0, items: data.items.map((n) => ({ ...n, read: true })) });
      api.post(`${base}/notifications/read`).catch(() => {});
    }
  };
  const go = (target) => {
    setOpen(false);
    const to = link(target);
    if (to) navigate(to);
  };

  const reminders = data?.reminders || [];
  const items = data?.items || [];
  const badge = (data?.unread || 0) + reminders.filter((r) => r.when !== "tomorrow").length;
  const whenLabel = { overdue: c.overdue, today: c.dueToday, tomorrow: c.dueTomorrow };

  return (
    <div className={`tm-bell ${className}`} ref={ref}>
      <button type="button" className="tm-bell-btn" onClick={toggle} aria-expanded={open} aria-label={c.bell} title={c.bell}>
        <BellIcon size={18} />
        {badge > 0 && <span className="tm-bell-badge">{badge > 9 ? "9+" : badge}</span>}
      </button>
      {open && (
        <div className="tm-bell-panel" role="dialog" aria-label={c.bell}>
          <div className="tm-bell-head"><strong>{c.bell}</strong></div>
          <div className="tm-bell-scroll">
            {reminders.length > 0 && (
              <div className="tm-bell-group">
                <span className="tm-bell-title">{c.reminders}</span>
                {reminders.map((r) => (
                  <button type="button" key={`r-${r.task}`} className={`tm-bell-item is-${r.when}`} onClick={() => go({ project: r.project, task: r.task, kind: "due" })}>
                    <span className={`tm-bell-dot is-${r.when}`} aria-hidden="true" />
                    <span className="tm-bell-text">
                      <span><bdi>{r.title}</bdi></span>
                      <span className="tm-small tm-muted">{whenLabel[r.when]} · {formatDue(r.dueDate, lang)} · <bdi>{r.projectName}</bdi></span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {items.length === 0 && reminders.length === 0 && <p className="tm-muted tm-bell-empty">{c.noNotes}</p>}
            {items.length > 0 && (
              <div className="tm-bell-group">
                {reminders.length > 0 && <span className="tm-bell-title">{c.bell}</span>}
                {items.map((n) => (
                  <button type="button" key={n.id} className={`tm-bell-item ${seen.has(n.id) ? "is-new" : ""}`} onClick={() => go(n)}>
                    <span className={`tm-bell-dot is-${n.kind}`} aria-hidden="true" />
                    <span className="tm-bell-text">
                      <span>{(c.note[n.kind] || ((a, d) => `${a}: ${d}`))(iso(n.actor || c.owner), iso(n.detail))}</span>
                      <span className="tm-small tm-muted">{timeAgo(n.createdAt, lang)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
