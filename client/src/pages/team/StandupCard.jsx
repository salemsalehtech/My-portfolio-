// StandupCard.jsx — the daily standup on the member's start page: three short answers
// (yesterday / today / blockers), one per day, seen by the owner in Admin → Team → Standups.
// Before posting it's a form; after posting it shows the answers with an Edit button.
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY } from "../../lib/team";
import { useTeam } from "./TeamPortal";

const EMPTY = { yesterday: "", today: "", blockers: "" };

export default function StandupCard() {
  const { t, lang } = useTeam();
  const c = SHARED_COPY[lang];
  const [saved, setSaved] = useState(undefined); // undefined = loading, null = not posted yet
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/team/standup").then(({ standup }) => {
      setSaved(standup);
      if (standup) setForm({ yesterday: standup.yesterday, today: standup.today, blockers: standup.blockers });
    }).catch((err) => { setSaved(null); setError(err.message); });
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { standup } = await api.put("/team/standup", form);
      setSaved(standup);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (saved === undefined) return null;
  const showForm = !saved || editing;
  return (
    <section className={`tm-standup ${saved && !editing ? "is-done" : ""}`}>
      <div className="tm-standup-head">
        <div>
          <h2>{c.standup}</h2>
          <p className="tm-muted tm-small">{saved && !editing ? c.standupDone : c.standupIntro}</p>
        </div>
        {saved && !editing && <button type="button" className="fp-btn fp-btn-ghost" onClick={() => setEditing(true)}>{c.edit}</button>}
      </div>

      {showForm ? (
        <form className="tm-standup-form" onSubmit={submit}>
          <label className="tm-field"><span>{c.yesterday}</span>
            <textarea className="fp-input" dir="auto" rows={2} value={form.yesterday} onChange={set("yesterday")} maxLength={2000} />
          </label>
          <label className="tm-field"><span>{c.todayQ}</span>
            <textarea className="fp-input" dir="auto" rows={2} value={form.today} onChange={set("today")} maxLength={2000} />
          </label>
          <label className="tm-field"><span>{c.blockers}</span>
            <textarea className="fp-input" dir="auto" rows={2} value={form.blockers} onChange={set("blockers")} maxLength={2000} placeholder={c.none} />
          </label>
          {error && <p className="tm-error" role="alert">{error}</p>}
          <div className="tm-row">
            <button className="fp-btn" type="submit" disabled={busy || !(form.yesterday.trim() || form.today.trim() || form.blockers.trim())}>{c.saveStandup}</button>
            {editing && <button className="fp-btn fp-btn-ghost" type="button" onClick={() => setEditing(false)}>{t.cancel}</button>}
          </div>
        </form>
      ) : (
        <dl className="tm-standup-view">
          <div><dt>{c.yesterdayShort}</dt><dd dir="auto">{saved.yesterday || "—"}</dd></div>
          <div><dt>{c.todayShort}</dt><dd dir="auto">{saved.today || "—"}</dd></div>
          <div className={saved.blockers ? "is-blocked" : ""}><dt>{c.blockersShort}</dt><dd dir="auto">{saved.blockers || c.none}</dd></div>
        </dl>
      )}
    </section>
  );
}
