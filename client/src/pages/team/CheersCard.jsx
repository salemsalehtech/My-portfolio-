// CheersCard.jsx — the encouraging part of the member's home page (GET /api/team/cheers):
// the shared team goal for the month, the member's badges, and the owner's thank-you notes.
// There is no rank, no points and no rating here — those stay in the owner's dashboard
// (owner decision 2026-11-08), so nobody is compared with a teammate.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY, timeAgo } from "../../lib/team";
import { AwardIcon, HeartIcon, TargetIcon, StarIcon } from "../../components/team/icons";
import { useTeam } from "./TeamPortal";

const BADGE_ORDER = ["star", "fifty", "ten", "first", "creative", "extraMile", "firstTime", "onTime", "standup"];

export default function CheersCard({ reloadKey }) {
  const { lang } = useTeam();
  const c = SHARED_COPY[lang];
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/team/cheers").then(setData).catch(() => setData(null)); }, [reloadKey]);
  if (!data) return null;
  const { goal, badges, kudos } = data;
  const pct = goal ? Math.min(100, Math.round((goal.done / goal.target) * 100)) : 0;
  const mine = BADGE_ORDER.filter((b) => badges.includes(b));

  return (
    <div className="tm-cheers">
      {goal && (
        <section className="cut-card tm-cheer tm-goal">
          <span className="cut-icon"><TargetIcon size={20} /></span>
          <div className="tm-cheer-main">
            <h3>{c.goal}</h3>
            {goal.label && <p className="tm-muted tm-small" dir="auto">{goal.label}</p>}
            <div className="tm-bar is-lg"><span style={{ width: `${pct}%` }} /></div>
            <p className="tm-small"><strong>{c.goalOf(goal.done, goal.target)}</strong> · {pct}%</p>
          </div>
        </section>
      )}

      <section className="cut-card tm-cheer">
        <span className="cut-icon"><AwardIcon size={20} /></span>
        <div className="tm-cheer-main">
          <h3>{c.badges}</h3>
          {mine.length === 0 ? <p className="tm-muted tm-small">{c.noBadges}</p> : (
            <ul className="tm-badges">
              {mine.map((b) => (
                <li key={b} className={`tm-badge is-${b}`} title={c.badge[b][1]}>
                  {b === "star" ? <StarIcon size={15} /> : <AwardIcon size={15} />}<span>{c.badge[b][0]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {kudos.length > 0 && (
        <section className="cut-card tm-cheer">
          <span className="cut-icon"><HeartIcon size={20} /></span>
          <div className="tm-cheer-main">
            <h3>{c.kudos}</h3>
            <ul className="tm-kudos">
              {kudos.slice(0, 3).map((k) => (
                <li key={k.id} className={k.star ? "is-star" : ""}>
                  <p dir="auto">{k.star && <StarIcon size={14} className="ui-icon" />} {k.message}</p>
                  <span className="tm-muted tm-small">{c.owner} · {timeAgo(k.createdAt, lang)}{k.task?.title ? ` · ${k.task.title}` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
