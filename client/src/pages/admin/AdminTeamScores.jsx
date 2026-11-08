// AdminTeamScores.jsx — Admin → Team → Scores: the owner's private view of how the team is doing
// (owner decision 2026-11-08: ranking and ratings are for the owner only; members never rate each
// other). Points come from the work itself — see server/src/lib/teamScores.js for the formula.
//   - the shared goal for the month (members see its progress bar too),
//   - star of the week: the top scorer of the last 7 days is suggested; one click sends it,
//   - the month's ranking with what the points are made of, and each member's badges,
//   - thank-you notes: send one, see the latest.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY, timeAgo } from "../../lib/team";
import { TrophyIcon, StarIcon, HeartIcon, TargetIcon, XIcon } from "../../components/team/icons";
import { toast } from "../../components/Toaster";
import { useAdminT } from "../../lib/adminI18n";

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminTeamScores() {
  const { t, lang } = useAdminT();
  const sc = SHARED_COPY[lang];
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState(null);
  const [kudos, setKudos] = useState([]);
  const [form, setForm] = useState({ member: "", message: "" });
  const [error, setError] = useState("");

  const load = () => {
    api.get(`/admin/team/scores?month=${month}`).then(setData).catch((err) => setError(err.message));
    api.get("/admin/team/kudos").then(setKudos).catch(() => {});
  };
  useEffect(load, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (body) => {
    setError("");
    try {
      await api.post("/admin/team/kudos", body);
      toast(body.star ? t("Star of the week sent") : t("Thank-you note sent"));
      setForm({ member: "", message: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const removeKudos = async (k) => {
    if (!confirm(t("Delete this note?"))) return;
    await api.del(`/admin/team/kudos/${k.id}`).catch(() => {});
    setKudos((list) => list.filter((x) => x.id !== k.id));
  };

  if (!data) return <p className={error ? "admin-error" : ""}>{error || t("Loading…")}</p>;
  const { ranking, starSuggestion: star, goal } = data;
  const pct = goal ? Math.min(100, Math.round((goal.done / goal.target) * 100)) : 0;

  return (
    <div className="tm-scores">
      <p className="admin-notice">{t("Only you see this page. Members see their own badges, your thank-you notes and the team goal — never a rank or a rating.")}</p>
      {error && <p className="admin-error">{error}</p>}

      <div className="tm-score-cards">
        <section className="cut-card tm-cheer">
          <span className="cut-icon"><TargetIcon size={20} /></span>
          <div className="tm-cheer-main">
            <h3>{t("Team goal this month")}</h3>
            {goal ? (
              <>
                <div className="tm-bar is-lg"><span style={{ width: `${pct}%` }} /></div>
                <p className="tm-small"><strong>{goal.done} / {goal.target}</strong> · {pct}%{goal.label ? ` · ${goal.label}` : ""}</p>
              </>
            ) : <p className="tm-muted tm-small">{t("No goal set — add one in Rules & goal.")}</p>}
          </div>
        </section>

        <section className="cut-card tm-cheer">
          <span className="cut-icon"><StarIcon size={20} /></span>
          <div className="tm-cheer-main">
            <h3>{t("Star of the week")}</h3>
            {star ? (
              <>
                <p><strong>{star.member.name}</strong> <span className="tm-muted tm-small">· {t("{n} points in 7 days", { n: star.points })} · {t("{n} tasks", { n: star.done })}</span></p>
                <button className="admin-btn admin-btn-primary" onClick={() => send({ member: star.member.id, star: true, message: t("You are this week's star — thank you for your work!") })}>
                  <StarIcon size={15} /> {t("Announce star of the week")}
                </button>
              </>
            ) : <p className="tm-muted tm-small">{t("No approved tasks in the last 7 days yet.")}</p>}
          </div>
        </section>
      </div>

      <div className="tm-score-head">
        <h2><TrophyIcon size={20} className="ui-icon" /> {t("Ranking")}</h2>
        <input className="form-input" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table tm-score-table">
          <thead>
            <tr>
              <th>#</th><th>{t("Member")}</th><th>{t("Points")}</th><th>{t("Approved")}</th><th>{t("On time")}</th>
              <th>{t("First time")}</th><th>{t("Avg rating")}</th><th>{t("Bonus")}</th><th>{t("Standups")}</th><th>{t("Badges")}</th>
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 && <tr><td colSpan={10} className="admin-empty">{t("No members yet.")}</td></tr>}
            {ranking.map((r, i) => (
              <tr key={r.member.id} className={i < 3 && r.points > 0 ? `is-top is-top-${i + 1}` : ""}>
                <td className="tm-num">{i + 1}</td>
                <td>{r.member.name}<div className="tm-small tm-muted">{r.member.specialty}</div></td>
                <td className="tm-num"><strong>{r.points}</strong></td>
                <td className="tm-num">{r.done}</td>
                <td className="tm-num">{r.onTime}</td>
                <td className="tm-num">{r.firstTime}</td>
                <td className="tm-num">{r.avgRating ?? "—"}</td>
                <td className="tm-num">{r.bonus}</td>
                <td className="tm-num">{r.standups}</td>
                <td><span className="tm-badge-row">{r.badges.map((b) => <span key={b} className="tm-badge is-mini" title={sc.badge[b][1]}>{sc.badge[b][0]}</span>)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tm-muted tm-small">{t("Points: 10 per approved task, +5 on time, +5 approved first time, +2 high / +4 urgent priority, + your rating (quality + creativity + manners), + bonus × 5, +1 per standup. Asking for help or more time never costs points.")}</p>

      <h2><HeartIcon size={20} className="ui-icon" /> {t("Thank-you notes")}</h2>
      <form className="admin-form tm-kudos-form" onSubmit={(e) => { e.preventDefault(); send(form); }}>
        <div className="admin-form-row">
          <label>{t("To")}
            <select className="form-input" value={form.member} onChange={(e) => setForm({ ...form, member: e.target.value })} required>
              <option value="">{t("— Pick a member —")}</option>
              {ranking.filter((r) => r.member.active).map((r) => <option key={r.member.id} value={r.member.id}>{r.member.name}</option>)}
            </select>
          </label>
          <label>{t("Message")}
            <input className="form-input" dir="auto" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={500} required />
          </label>
        </div>
        <div className="admin-form-actions"><button className="admin-btn admin-btn-primary">{t("Send")}</button></div>
      </form>
      <ul className="tm-kudos is-admin">
        {kudos.map((k) => (
          <li key={k.id} className={k.star ? "is-star" : ""}>
            <p dir="auto">{k.star && <StarIcon size={14} className="ui-icon" />} <strong>{k.member?.name || "—"}</strong> · {k.message}</p>
            <span className="tm-muted tm-small">{timeAgo(k.createdAt, lang)}{k.task?.title ? ` · ${k.task.title}` : ""}</span>
            <button type="button" className="tm-icon-btn" onClick={() => removeKudos(k)} aria-label={t("Delete")}><XIcon size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
