// AvailabilityCard.jsx — the member says if they have room for more work: Available / Busy /
// Away until a date (+ an optional note). The owner sees it next to the member's name in the
// overview and in the "Assigned to" list (routes/team.js → PUT /availability).
import { useState } from "react";
import { api } from "../../lib/api";
import { SHARED_COPY, formatDue, today } from "../../lib/team";
import { useTeam } from "./TeamPortal";

const STATES = ["available", "busy", "away"];

export default function AvailabilityCard() {
  const { lang, member, setMember, msg } = useTeam();
  const c = SHARED_COPY[lang];
  const now = member.availability || { status: "available", until: "", note: "" };
  const [form, setForm] = useState(now);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (next = form) => {
    setBusy(true);
    setError("");
    try {
      setMember(await api.put("/team/availability", next));
      setEditing(false);
    } catch (err) {
      setError(msg(err.message));
    } finally {
      setBusy(false);
    }
  };
  // "Available" needs no date or note, so it saves at once.
  const choose = (status) => {
    const next = { ...form, status };
    setForm(next);
    if (status === "available") save({ status, until: "", note: "" });
    else setEditing(true);
  };

  return (
    <section className={`tm-avail-card is-${now.status}`}>
      <div className="tm-avail-head">
        <span className="tm-avail-label">{c.availQ}</span>
        <div className="tm-segment" role="radiogroup" aria-label={c.availQ}>
          {STATES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={(editing ? form.status : now.status) === s}
              className={(editing ? form.status : now.status) === s ? "is-on" : ""} onClick={() => choose(s)} disabled={busy}>
              <span className={`tm-dot is-${s}`} />{c.avail[s]}
            </button>
          ))}
        </div>
      </div>
      {!editing && now.status !== "available" && (
        <p className="tm-small tm-muted">
          {now.until ? `${c.availUntil} ${formatDue(now.until, lang)}` : ""}{now.until && now.note ? " · " : ""}<span dir="auto">{now.note}</span>
        </p>
      )}
      {!editing && now.status === "available" && <p className="tm-small tm-muted">{c.availHint}</p>}
      {editing && (
        <form className="tm-avail-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label>{c.availUntil}<input className="fp-input" type="date" min={today()} value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} /></label>
          <label>{c.availNote}<input className="fp-input" dir="auto" maxLength={120} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <div className="actions">
            <button type="button" className="fp-btn fp-btn-ghost" onClick={() => { setForm(now); setEditing(false); }}>{c.cancel}</button>
            <button className="fp-btn" disabled={busy}>{c.availSave}</button>
          </div>
        </form>
      )}
      {error && <p className="tm-error" role="alert">{error}</p>}
    </section>
  );
}
