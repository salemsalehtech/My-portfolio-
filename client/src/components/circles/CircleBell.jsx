// CircleBell.jsx — the notification bell 🔔 of the savings circles, for the member portal
// (/#/gam3eya) and the dashboard's top bar. Same look and behaviour as the team bell
// (components/team/Bell.jsx): refreshed every minute, reminders first, opening it marks all read.
//
// Props:
//   path        where to load { items, unread, reminders } ("/circle/notifications" or
//               "/admin/circles/notifications/all"); marking read posts to `readPath`
//   reminder(r) → { text, sub, tone, to } for one reminder; note(n) → { text, to } for one
//               notification (`to` = where a click leads, or null)
//   title, empty, className, icon
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/team";
import { BellIcon } from "../team/icons";

const iso = (text) => `⁨${text}⁩`;

export default function CircleBell({ path, readPath, lang = "ar", reminder, note, title, empty, remindersTitle, className = "", icon }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(() => new Set());
  const ref = useRef(null);

  const load = () => api.get(path).then(setData).catch(() => {});
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 60 * 1000);
    const onShow = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onShow); };
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const badge = (data?.unread || 0) + reminders.filter((r) => r.tone !== "soon").length;

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
                  <button type="button" key={`r${i}`} className="tm-bell-item" onClick={() => go(r.to)}>
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
                  const { text, to } = note({ ...n, actor: iso(n.actor), detail: iso(n.detail) });
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
