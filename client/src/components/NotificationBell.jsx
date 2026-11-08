// NotificationBell.jsx — the one notification bell of the product: the team portal, the savings
// circles portal and both bells in the dashboard's top bar. Refreshed every minute and when the
// tab comes back into view; opening it lists reminders first, then the latest notifications, and
// marks them read (the new ones stay highlighted while the list is open).
//
// Props:
//   path        where to load { items, unread, reminders } — e.g. "/team/notifications"
//   readPath    where to post "all read" — e.g. "/team/notifications/read"
//   reminder(r) → { text, sub, tone, quiet, to } for one reminder: `tone` colours its dot
//               ("overdue" | "today" | "soon" | …), `quiet` keeps it out of the red count
//               (default: tone "soon"), `to` = where a click leads (or null)
//   note(n)     → { text, to } for one notification; `n.actor` / `n.detail` arrive wrapped in
//               Unicode isolates (iso) so a name in the other script keeps its place
//   title, empty, remindersTitle, lang, className, icon
// The team bell (components/team/Bell.jsx) is this component with the team's wording.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { timeAgo } from "../lib/team";
import { BellIcon } from "./team/icons";

const EVERY_MS = 60 * 1000;
// Wraps a name / title in Unicode isolate marks, so English text inside an Arabic sentence
// (or the other way round) keeps its place.
export const iso = (text) => `⁨${text}⁩`;

export default function NotificationBell({ path, readPath, lang = "ar", reminder, note, title, empty, remindersTitle, className = "", icon }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(() => new Set()); // ids that were unread when the bell opened
  const ref = useRef(null);

  const load = () => api.get(path).then(setData).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, EVERY_MS);
    const onShow = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onShow); };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setFresh(new Set(data.items.filter((n) => !n.read).map((n) => n.id)));
      setData({ ...data, unread: 0, items: data.items.map((n) => ({ ...n, read: true })) });
      api.post(readPath).catch(() => {});
    }
  };
  const go = (to) => { setOpen(false); if (to) navigate(to); };

  const reminders = (data?.reminders || []).map(reminder);
  const items = data?.items || [];
  const badge = (data?.unread || 0) + reminders.filter((r) => !(r.quiet ?? r.tone === "soon")).length;

  return (
    <div className={`tm-bell ${className}`} ref={ref}>
      <button type="button" className="tm-bell-btn" onClick={toggle} aria-expanded={open} aria-label={title} title={title}>
        {icon || <BellIcon size={18} />}
        {badge > 0 && <span className="tm-bell-badge">{badge > 9 ? "9+" : badge}</span>}
      </button>
      {open && (
        <div className="tm-bell-panel" role="dialog" aria-label={title}>
          <div className="tm-bell-head"><strong>{title}</strong></div>
          <div className="tm-bell-scroll">
            {reminders.length > 0 && (
              <div className="tm-bell-group">
                <span className="tm-bell-title">{remindersTitle}</span>
                {reminders.map((r, i) => (
                  <button type="button" key={`r${i}`} className={`tm-bell-item is-${r.tone}`} onClick={() => go(r.to)}>
                    <span className={`tm-bell-dot is-${r.tone}`} aria-hidden="true" />
                    <span className="tm-bell-text"><span>{r.text}</span>{r.sub && <span className="tm-small tm-muted">{r.sub}</span>}</span>
                  </button>
                ))}
              </div>
            )}
            {items.length === 0 && reminders.length === 0 && <p className="tm-muted tm-bell-empty">{empty}</p>}
            {items.length > 0 && (
              <div className="tm-bell-group">
                {reminders.length > 0 && <span className="tm-bell-title">{title}</span>}
                {items.map((n) => {
                  const { text, to } = note({ ...n, actor: n.actor ? iso(n.actor) : "", detail: iso(n.detail) });
                  return (
                    <button type="button" key={n.id} className={`tm-bell-item ${fresh.has(n.id) ? "is-new" : ""}`} onClick={() => go(to)}>
                      <span className={`tm-bell-dot is-${n.kind}`} aria-hidden="true" />
                      <span className="tm-bell-text"><span>{text}</span><span className="tm-small tm-muted">{timeAgo(n.createdAt, lang)}</span></span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
