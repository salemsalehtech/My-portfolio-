// Bell.jsx — the team's notification bell (member portal top bar and the dashboard): the shared
// NotificationBell with the team's wording. Due-date reminders (overdue / today / tomorrow —
// worked out live by the server) come first; "tomorrow" doesn't add to the red count.
// Props: `base` ("/team" for members, "/admin/team" for the owner), `lang`, `className`, and
// `link({ project, task, kind })` → where a click leads (or null).
import NotificationBell, { iso } from "../NotificationBell";
import { SHARED_COPY, formatDue } from "../../lib/team";

export default function Bell({ base, lang = "en", link, className = "" }) {
  const c = SHARED_COPY[lang];
  const whenLabel = { overdue: c.overdue, today: c.dueToday, tomorrow: c.dueTomorrow };
  return (
    <NotificationBell
      path={`${base}/notifications`}
      readPath={`${base}/notifications/read`}
      lang={lang}
      className={className}
      title={c.bell}
      empty={c.noNotes}
      remindersTitle={c.reminders}
      reminder={(r) => ({
        text: <bdi>{r.title}</bdi>,
        sub: <>{whenLabel[r.when]} · {formatDue(r.dueDate, lang)} · <bdi>{r.projectName}</bdi></>,
        tone: r.when,
        quiet: r.when === "tomorrow",
        to: link({ project: r.project, task: r.task, kind: "due" }),
      })}
      note={(n) => ({
        text: (c.note[n.kind] || ((a, d) => `${a}: ${d}`))(n.actor || iso(c.owner), n.detail),
        to: link(n),
      })}
    />
  );
}
