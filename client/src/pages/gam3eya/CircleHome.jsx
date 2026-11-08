// CircleHome.jsx — the member's page (/#/gam3eya): one card per circle they're in, showing ONLY
// their own part:
//   - the next payment (amount, date, countdown) with "Pay now" (PayModal.jsx),
//   - their turn(s): when and how much they receive; after the owner hands it over they confirm,
//   - savings progress + their goal, "add dates to my calendar" (.ics), "I need my turn early",
//   - month by month (state of each month) and their payments with receipts,
//   - for a helper: the circle's payments waiting for confirmation,
//   - a printable certificate when the circle has finished.
// Below: phone notifications, and "put me on the list for the next circle".
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fetchImageUrl } from "../../lib/api";
import { money, day, monthName, daysUntil, downloadCalendar, METHOD_LABEL, STATE_LABEL } from "../../lib/circles";
import PushPrompt from "../../components/PushPrompt";
import CircleRing from "../../components/circles/CircleRing";
import { toast } from "../../components/Toaster";
import { useCircle } from "./CirclePortal";
import PayModal from "./PayModal";
import { HourglassIcon, CalendarIcon, AwardIcon, WalletIcon, TargetIcon, ForwardIcon } from "../../components/team/icons";

export default function CircleHome() {
  const { t, msg, member, setMember } = useCircle();
  const [circles, setCircles] = useState(null);
  const [payInfo, setPayInfo] = useState(null);
  const [paying, setPaying] = useState(null); // { circle, month }
  const [error, setError] = useState("");

  const load = () => api.get("/circle/circles").then(setCircles).catch((err) => setError(err.message));
  useEffect(() => { load(); api.get("/circle/pay-info").then(setPayInfo).catch(() => {}); }, []);

  return (
    <main className="tm-page gm-page">
      <header className="tm-hello">
        <h1>{t.hello(member.name.split(" ")[0])}</h1>
      </header>
      {error && <p className="tm-error">{msg(error)}</p>}
      {circles === null && !error && <p className="tm-muted">{t.loading}</p>}
      {circles && circles.length === 0 && <p className="tm-empty">{t.noCircles}</p>}
      {circles && circles.map((c) => (
        <CircleCard key={c.id} circle={c} onPay={(month) => setPaying({ circle: c, month })} onChange={setCircles} reload={load} />
      ))}
      <PushPrompt base="/circle" text={{ on: t.pushOn, done: t.pushOnDone, blocked: t.pushBlocked, ios: t.pushIos, error: t.error }} />
      <WaitlistCard member={member} onChange={setMember} />
      {paying && <PayModal circle={paying.circle} month={paying.month} payInfo={payInfo} onClose={() => setPaying(null)} onSent={() => { setPaying(null); load(); }} />}
    </main>
  );
}

function CircleCard({ circle, onPay, onChange, reload }) {
  const { t, lang, member, setMember } = useCircle();
  const me = circle.me;
  const today = circle.today;
  const open = me.dues.filter((d) => d.state !== "paid");
  // The next month to pay; one whose payment is being checked is skipped (it can't be paid again).
  const next = open.find((d) => d.state !== "review") || open[0];
  const checking = open.filter((d) => d.state === "review").length;
  const pct = me.totalToPay ? Math.round((me.paidSoFar / me.totalToPay) * 100) : 0;
  const finished = circle.status === "finished";

  // My turn is this month: celebrate once (remembered per browser, per circle and month).
  const turnNow = !finished && circle.turns.some((x) => x.month === circle.currentMonth && !x.receivedAt);
  useEffect(() => {
    if (!turnNow) return;
    const key = `gmTurn:${circle.id}:${circle.currentMonth}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch { return; }
    toast(t.ringTurnNow, { confetti: true, ms: 5000 });
  }, [turnNow, circle.id, circle.currentMonth, t.ringTurnNow]);

  return (
    <section className={`gm-circle ${finished ? "is-finished" : ""}`}>
      <header className="gm-circle-head">
        <div>
          <h2 dir="auto">{circle.name}</h2>
          <p className="tm-muted tm-small">{money(me.monthlyDue, lang)} {t.perMonth} · {t.shares(me.share)} · {circle.months} {lang === "ar" ? "شهور" : "months"}</p>
        </div>
        {finished && <span className="tm-pill">{t.finished}</span>}
      </header>

      <CircleRing circle={circle} t={t} />
      <div className="gm-boxes">
        {!finished && (
          <div className={`gm-box ${next?.state === "late" ? "is-late" : next ? "" : "is-ok"}`}>
            <span className="gm-box-label">{t.nextPayment}</span>
            {next ? (
              <>
                <strong className="gm-amount">{money(next.due - next.paid, lang)}</strong>
                <span className="tm-small">{monthName(next.dueDate, lang)} · {t.due} {day(next.dueDate, lang)}</span>
                <span className={`gm-count ${next.state === "late" ? "is-late" : ""}`}>
                  {next.state === "late" ? t.daysLate(-daysUntil(next.dueDate, today)) : next.state === "review" ? STATE_LABEL[lang].review : t.daysLeft(daysUntil(next.dueDate, today))}
                </span>
                {checking > 0 && next.state !== "review" && <span className="tm-small tm-muted"><HourglassIcon size={13} className="ui-icon" /> {STATE_LABEL[lang].review}: {checking}</span>}
                {next.state !== "review" && <button className="fp-btn" onClick={() => onPay(next.month)}>{t.payNow}</button>}
              </>
            ) : <strong className="gm-amount">{t.allPaid}</strong>}
          </div>
        )}
        {circle.turns.map((turn) => (
          <TurnBox key={turn.month} circle={circle} turn={turn} onChange={onChange} />
        ))}
      </div>

      <div className="gm-progress">
        <div className="gm-progress-top">
          <span>{t.progress}: <strong>{money(me.paidSoFar, lang)}</strong> {t.of} {money(me.totalToPay, lang)}</span>
          <span className="tm-muted">{pct}%</span>
        </div>
        <span className="tm-bar"><span style={{ width: `${pct}%` }} /></span>
        <Goal member={member} onChange={setMember} />
      </div>

      <div className="gm-actions">
        {!finished && <button className="fp-btn fp-btn-ghost" onClick={() => downloadCalendar(circle, lang)}><CalendarIcon size={16} /> {t.addCalendar}</button>}
        {finished && <Link className="fp-btn fp-btn-ghost" to={`/gam3eya/certificate/${circle.id}`}><AwardIcon size={16} /> {t.certificate}</Link>}
      </div>
      {!finished && <EarlyTurn circle={circle} reload={reload} />}

      <details className="gm-details">
        <summary>{t.months}</summary>
        <table className="gm-table">
          <thead><tr><th>{t.month}</th><th>{t.due}</th><th>{t.amount}</th><th>{t.status}</th></tr></thead>
          <tbody>
            {me.dues.map((d) => (
              <tr key={d.month} className={`is-${d.state}`}>
                <td>{monthName(d.dueDate, lang)}</td>
                <td>{day(d.dueDate, lang)}</td>
                <td>{money(d.due, lang)}{d.paid > 0 && d.paid < d.due ? <span className="tm-muted tm-small"> ({money(d.paid, lang)})</span> : null}</td>
                <td><span className={`gm-state is-${d.state}`}>{STATE_LABEL[lang][d.state]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <details className="gm-details">
        <summary>{t.payments} <span className="tm-count">{circle.payments.length}</span></summary>
        {circle.payments.length === 0 && <p className="tm-muted">{t.noPayments}</p>}
        <ul className="gm-payments">
          {[...circle.payments].reverse().map((p) => (
            <li key={p.id} className={`is-${p.status}`}>
              <span><strong>{money(p.amount, lang)}</strong> · {METHOD_LABEL[lang][p.method]} · {monthName(me.dues[p.month]?.dueDate, lang)}</span>
              <span className={`gm-state is-${p.status === "confirmed" ? "paid" : p.status === "pending" ? "review" : "late"}`}>
                {p.status === "confirmed" ? STATE_LABEL[lang].paid : p.status === "pending" ? STATE_LABEL[lang].review : t.rejected}
              </span>
              {p.status === "rejected" && p.rejectReason && <span className="tm-small tm-late">{t.why}: {p.rejectReason}</span>}
              {p.status === "confirmed" && <Link className="tm-small" to={`/gam3eya/receipt/${p.id}`}>{t.receipt} ↗</Link>}
            </li>
          ))}
        </ul>
      </details>

      {circle.isHelper && <HelperReview circle={circle} reload={reload} />}
    </section>
  );
}

function TurnBox({ circle, turn, onChange }) {
  const { t, lang, msg } = useCircle();
  const [error, setError] = useState("");
  const left = daysUntil(turn.payoutDate, circle.today);
  const confirm = async () => {
    try { onChange(await api.post(`/circle/circles/${circle.id}/turns/${turn.month}/received`)); } catch (err) { setError(err.message); }
  };
  return (
    <div className={`gm-box gm-turn ${turn.receivedAt ? "is-ok" : ""}`}>
      <span className="gm-box-label"><WalletIcon size={14} className="ui-icon" /> {t.myTurn} · {monthName(turn.payoutDate, lang)}</span>
      <strong className="gm-amount">{money(turn.amount, lang)}</strong>
      <span className="tm-small">{day(turn.payoutDate, lang)}{turn.shared ? ` · ${t.sharedWith}` : ""}</span>
      {turn.receivedAt ? <span className="gm-count is-ok">{t.receivedOk}</span>
        : turn.handedAt ? (<><span className="tm-small">{t.handed}</span><button className="fp-btn" onClick={confirm}>{t.confirmReceived}</button></>)
          : left >= 0 && <span className="gm-count">{t.daysLeft(left)}</span>}
      {error && <span className="tm-error tm-small">{msg(error)}</span>}
    </div>
  );
}

function Goal({ member, onChange }) {
  const { t } = useCircle();
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(member.goal);
  const save = async (e) => { e.preventDefault(); onChange(await api.put("/circle/me", { goal })); setEditing(false); };
  if (!editing && member.goal) return <p className="gm-goal"><TargetIcon size={14} className="ui-icon" /> {t.goal}: <strong dir="auto">{member.goal}</strong> <button className="tm-link-btn" onClick={() => setEditing(true)}>{t.editGoal}</button></p>;
  if (!editing) return <button className="tm-link-btn gm-goal" onClick={() => setEditing(true)}><TargetIcon size={14} className="ui-icon" /> {t.goal}…</button>;
  return (
    <form className="gm-inline" onSubmit={save}>
      <input className="fp-input" dir="auto" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={120} placeholder={t.goalPlaceholder} autoFocus />
      <button className="fp-btn" type="submit">{t.setGoal}</button>
    </form>
  );
}

function EarlyTurn({ circle, reload }) {
  const { t, msg } = useCircle();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const last = circle.requests[0];
  if (last?.status === "open") return <p className="tm-note gm-request"><HourglassIcon size={14} className="ui-icon" /> {t.requestOpen}</p>;
  const send = async (e) => {
    e.preventDefault();
    setError("");
    try { await api.post(`/circle/circles/${circle.id}/requests`, { reason }); setOpen(false); setReason(""); reload(); } catch (err) { setError(err.message); }
  };
  return (
    <div className="gm-request">
      {last && <p className="tm-small tm-muted">{t.earlyTurn}: {t.requestAnswered(last.status === "accepted", last.reply)}</p>}
      {!open ? <button className="tm-link-btn" onClick={() => setOpen(true)}><ForwardIcon size={14} className="ui-icon" /> {t.earlyTurn}</button> : (
        <form className="gm-inline" onSubmit={send}>
          <input className="fp-input" dir="auto" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder={t.earlyReason} required autoFocus />
          <button className="fp-btn" type="submit">{t.send}</button>
          <button className="fp-btn fp-btn-ghost" type="button" onClick={() => setOpen(false)}>{t.cancel}</button>
        </form>
      )}
      {error && <p className="tm-error tm-small">{msg(error)}</p>}
    </div>
  );
}

// A helper confirms or rejects the circle's payments (with the screenshot).
function HelperReview({ circle, reload }) {
  const { t, lang, msg } = useCircle();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get(`/circle/helper/${circle.id}/payments`).then(setList).catch((err) => setError(err.message));
  useEffect(() => { load(); }, [circle.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const decide = async (p, decision) => {
    const reason = decision === "reject" ? window.prompt(t.rejectReason) : "";
    if (decision === "reject" && !reason) return;
    try { await api.post(`/circle/helper/${circle.id}/payments/${p.id}`, { decision, reason }); load(); reload(); } catch (err) { setError(err.message); }
  };
  return (
    <div className="gm-helper">
      <h3>{t.review}</h3>
      <p className="tm-muted tm-small">{t.reviewIntro}</p>
      {error && <p className="tm-error">{msg(error)}</p>}
      {list && list.length === 0 && <p className="tm-muted">{t.nothingToReview}</p>}
      {list && list.map((p) => (
        <div className="gm-review-row" key={p.id}>
          {p.hasProof && <Proof path={`/circle/payments/${p.id}/proof`} />}
          <div className="gm-review-info">
            <strong>{p.member?.name}</strong>
            <span>{money(p.amount, lang)} · {METHOD_LABEL[lang][p.method]}</span>
            {p.note && <span className="tm-small tm-muted" dir="auto">“{p.note}”</span>}
          </div>
          <div className="tm-row">
            <button className="fp-btn" onClick={() => decide(p, "confirm")}>{t.confirmPay}</button>
            <button className="fp-btn fp-btn-ghost" onClick={() => decide(p, "reject")}>{t.rejectPay}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// A protected screenshot (loaded with the login, opened full size on click).
export function Proof({ path }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let made = "";
    fetchImageUrl(path).then((u) => { made = u; setUrl(u); }).catch(() => {});
    return () => { if (made) URL.revokeObjectURL(made); };
  }, [path]);
  if (!url) return <span className="gm-proof is-empty" />;
  return <a className="gm-proof" href={url} target="_blank" rel="noreferrer"><img src={url} alt="" /></a>;
}

function WaitlistCard({ member, onChange }) {
  const { t } = useCircle();
  const [note, setNote] = useState("");
  const set = async (on) => onChange(await api.post("/circle/waitlist", { on, note }));
  return (
    <section className="gm-wait">
      <h3>{t.waitTitle}</h3>
      {member.waitlist?.on ? (
        <div className="tm-row"><span>{t.waitOn}</span><button className="tm-link-btn" onClick={() => set(false)}>{t.waitLeave}</button></div>
      ) : (
        <form className="gm-inline" onSubmit={(e) => { e.preventDefault(); set(true); }}>
          <span className="tm-muted">{t.waitOff}</span>
          <input className="fp-input" dir="auto" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t.waitNote} />
          <button className="fp-btn" type="submit">{t.waitJoin}</button>
        </form>
      )}
    </section>
  );
}
