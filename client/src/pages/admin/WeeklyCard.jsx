// WeeklyCard.jsx — "This week" at the top of Admin → Team → Overview (GET /api/admin/team/weekly):
// tasks approved in the last 7 days (and how many on the first try), what is late, open help and
// more-time requests, standups posted, and who finished what. Every Thursday afternoon the owner
// also gets a notification pointing here (server/src/lib/teamJobs.js).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { CheckCircleIcon, AlertIcon, ClockIcon, ListIcon } from "../../components/team/icons";
import { useAdminT } from "../../lib/adminI18n";

export default function WeeklyCard() {
  const { t } = useAdminT();
  const [w, setW] = useState(null);
  useEffect(() => { api.get("/admin/team/weekly").then(setW).catch(() => {}); }, []);
  if (!w) return <div className="tm-skeleton" style={{ height: 120, marginBottom: 16 }} />;
  const stats = [
    { Icon: CheckCircleIcon, value: w.done, label: t("approved"), sub: t("{n} first time", { n: w.firstTime }) },
    { Icon: AlertIcon, value: w.late, label: t("late now"), tone: w.late ? "late" : "" },
    { Icon: ClockIcon, value: w.help.length + w.extensions.length, label: t("help / time requests"), tone: w.help.length + w.extensions.length ? "review" : "" },
    { Icon: ListIcon, value: w.standups, label: t("standups posted") },
  ];
  return (
    <section className="cut-card tm-weekly">
      <h2>{t("This week")} <span className="admin-sub">· {w.from} → {w.to}</span></h2>
      <div className="tm-stats">
        {stats.map(({ Icon, value, label, sub, tone }) => (
          <div key={label} className={`tm-stat ${tone ? `is-${tone}` : ""}`}>
            <span className="tm-stat-icon"><Icon size={18} /></span>
            <strong>{value}</strong>
            <span>{label}{sub ? ` · ${sub}` : ""}</span>
          </div>
        ))}
      </div>
      {(w.help.length > 0 || w.extensions.length > 0) && (
        <ul className="tm-weekly-list">
          {w.help.map((x) => <li key={`h${x.id}`}><span className="tm-flag is-help"><AlertIcon size={14} /></span> {x.title}</li>)}
          {w.extensions.map((x) => <li key={`e${x.id}`}><span className="tm-flag is-time"><ClockIcon size={14} /></span> {x.title}</li>)}
        </ul>
      )}
      {w.perMember.some((m) => m.done) && (
        <p className="tm-small tm-muted">
          {w.perMember.filter((m) => m.done).map((m) => `${m.member.name}: ${m.done}`).join(" · ")}
          {" · "}<Link to="/admin/team?tab=scores">{t("Scores")} ›</Link>
        </p>
      )}
    </section>
  );
}
