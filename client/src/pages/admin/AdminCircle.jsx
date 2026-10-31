// AdminCircle.jsx — one savings circle for the owner (/admin/circles/:id), loaded on demand.
//   Board    — members × months: each cell shows paid / being checked / late / upcoming; a click
//              opens that month of that member: screenshots, confirm / reject / delete, record a
//              cash payment. Late members get a ready WhatsApp reminder.
//   Months   — who receives which month (one person, or two halves), payout hand-over (the member
//              then confirms receiving), helpers, and the circle's settings. In a draft everything
//              can change; once running only months not yet paid out can be reordered.
//   Requests & log — early-turn requests and everything that happened in this circle.
// Tools: start / finish, "new circle with the same members", Excel statement, print the schedule,
// a month summary to paste in the WhatsApp group.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { money, day, monthName, METHOD_LABEL, METHODS, STATE_LABEL, PARTS, shareText, equalParts, whatsappLink } from "../../lib/circles";
import { timeAgo } from "../../lib/team";
import { MessageIcon, PrinterIcon, DownloadIcon, CheckIcon, ClockIcon, BellIcon } from "../../components/team/icons";
import { useAdminT } from "../../lib/adminI18n";
import { ProofImage, reviewPayment, LOG_ACTIONS } from "./AdminCircles";

const portal = () => `${window.location.origin}${window.location.pathname}#/gam3eya`;

export default function AdminCircle() {
  const { t, lang } = useAdminT();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState("board");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(false);

  const load = () => api.get(`/admin/circles/${id}`).then((d) => { setData(d); if (d.circle.status === "draft") setTab((x) => (x === "board" ? "months" : x)); }).catch((err) => setError(err.message));
  useEffect(() => { load(); api.get("/admin/circles/members/all").then(setMembers); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <p className={error ? "admin-error" : ""}>{error || t("Loading…")}</p>;
  const { circle, statement } = data;
  const nameOf = Object.fromEntries(members.map((m) => [m.id, m]));
  circle.slots.forEach((s) => s.holders.forEach((h) => { if (h.member?.id) nameOf[h.member.id] = { ...nameOf[h.member.id], ...h.member }; }));

  const act = async (fn, after) => { setError(""); try { const r = await fn(); after ? after(r) : load(); } catch (err) { setError(err.message); } };
  const start = () => act(() => { if (confirm(t("Start the circle? Amounts and dates are fixed after this, and every member is notified."))) return api.post(`/admin/circles/${id}/start`); }, () => { load(); setTab("board"); });
  const finish = () => act(() => { if (confirm(t("Mark this circle as finished?"))) return api.post(`/admin/circles/${id}/finish`); });
  const clone = () => act(() => api.post(`/admin/circles/${id}/clone`), (c) => navigate(`/admin/circles/${c.id}`));
  const remove = () => act(async () => {
    if (!confirm(t("Delete “{name}” with all its payments and log? This cannot be undone.", { name: circle.name }))) return;
    await api.del(`/admin/circles/${id}`);
    navigate("/admin/circles");
  }, () => {});

  const STATUS = { draft: t("Draft"), active: t("Running"), finished: t("Finished") };
  return (
    <div className="tm-admin gm-admin">
      <p className="gm-noprint"><Link to="/admin/circles">{t("← Savings circles")}</Link></p>
      <div className="gm-head gm-noprint">
        <div>
          <h1 dir="auto">{circle.name} <span className={`tm-pill ${circle.status === "finished" ? "is-off" : ""}`}>{STATUS[circle.status]}</span></h1>
          <p className="admin-sub">
            {money(circle.shareAmount, lang)} {t("a month per share")} · {circle.slots.length} {t("months")} · {t("pot")} {money(statement.pot, lang)} ·
            {" "}{t("pay by day {d}, payout on day {p}", { d: circle.payDay, p: circle.payoutDay })}
          </p>
        </div>
        <div className="gm-head-actions">
          {circle.status === "draft" && <button className="admin-btn admin-btn-primary" onClick={start}>▶ {t("Start circle")}</button>}
          {circle.status === "active" && <button className="admin-btn" onClick={() => setSummary(true)}><MessageIcon size={15} /> {t("Group summary")}</button>}
          {circle.status !== "draft" && <button className="admin-btn" onClick={() => downloadStatement(data, nameOf, lang, t)}><DownloadIcon size={15} /> {t("Excel")}</button>}
          <button className="admin-btn" onClick={() => window.print()}><PrinterIcon size={15} /> {t("Print schedule")}</button>
          <button className="admin-btn" onClick={clone}>⧉ {t("New circle, same members")}</button>
          {circle.status === "active" && <button className="admin-btn" onClick={finish}>{t("Finish")}</button>}
          <button className="admin-btn admin-btn-danger" onClick={remove}>{t("Delete")}</button>
        </div>
      </div>
      {error && <p className="admin-error gm-noprint">{error}</p>}

      <div className="admin-toolbar gm-noprint">
        {[["board", "Payments board"], ["months", "Months & payouts"], ["more", "Requests & log"]].filter(([k]) => k !== "board" || circle.status !== "draft").map(([key, label]) => (
          <button key={key} className={`admin-btn ${tab === key ? "admin-btn-primary" : ""}`} onClick={() => setTab(key)}>
            {t(label)}{key === "more" && data.requests.some((r) => r.status === "open") ? " •" : ""}
          </button>
        ))}
      </div>

      <div className="gm-noprint">
        {tab === "board" && <Board data={data} nameOf={nameOf} reload={load} />}
        {tab === "months" && <Months data={data} members={members} nameOf={nameOf} reload={load} setError={setError} />}
        {tab === "more" && <More data={data} reload={load} />}
      </div>
      <PrintSchedule data={data} nameOf={nameOf} />
      {summary && <GroupSummary data={data} nameOf={nameOf} onClose={() => setSummary(false)} />}
    </div>
  );
}

// ---- Board: members × months ----
function Board({ data, nameOf, reload }) {
  const { t, lang } = useAdminT();
  const { circle, statement, payments } = data;
  const [cell, setCell] = useState(null); // { member, month }
  const remindText = (m, d) => (lang === "ar"
    ? `أهلًا ${nameOf[m.member]?.name?.split(" ")[0] || ""}، تذكير بقسط جمعية «${circle.name}» عن شهر ${monthName(d.dueDate, "ar")}: ${d.due - d.paid} ج.م (ميعاده ${day(d.dueDate, "ar")}). تقدر تدفع وترفع صورة التحويل من هنا: ${portal()}`
    : `Hi ${nameOf[m.member]?.name?.split(" ")[0] || ""}, a reminder for the "${circle.name}" payment for ${monthName(d.dueDate, "en")}: EGP ${d.due - d.paid} (due ${day(d.dueDate, "en")}). Pay and upload the screenshot here: ${portal()}`);
  const late = statement.members.flatMap((m) => m.dues.filter((d) => d.state === "late").map((d) => ({ m, d })));
  const cur = statement.currentMonth;

  return (
    <div>
      {late.length > 0 && (
        <section className="admin-linkbox gm-late">
          <h2 className="tm-admin-h"><BellIcon size={16} className="ui-icon" /> {t("Remind the late ones")} <span className="tm-count">{late.length}</span></h2>
          <div className="gm-late-list">
            {late.map(({ m, d }) => (
              <a key={`${m.member}-${d.month}`} className="admin-btn" href={whatsappLink(nameOf[m.member]?.phone, remindText(m, d))} target="_blank" rel="noreferrer">
                {nameOf[m.member]?.name} · {monthName(d.dueDate, lang)} · {money(d.due - d.paid, lang)} ↗
              </a>
            ))}
          </div>
        </section>
      )}
      <div className="gm-board-wrap">
        <table className="gm-board">
          <thead>
            <tr>
              <th>{t("Member")}</th>
              {statement.months.map((mo) => <th key={mo.index} className={mo.index === cur ? "is-current" : ""}>{monthName(mo.dueDate, lang)}</th>)}
              <th>{t("Paid")}</th>
            </tr>
          </thead>
          <tbody>
            {statement.members.map((m) => (
              <tr key={m.member}>
                <th scope="row">
                  <span>{nameOf[m.member]?.name || "—"}</span>
                  <span className="tm-small tm-muted">{m.share === 1 ? "" : `${shareText(m.share)} ${t("shares")} · `}{money(m.monthlyDue, lang)}</span>
                </th>
                {m.dues.map((d) => {
                  const turn = statement.months[d.month].holders.some((h) => h.member === m.member);
                  return (
                    <td key={d.month} className={d.month === cur ? "is-current" : ""}>
                      <button type="button" className={`gm-cell is-${d.state}`} onClick={() => setCell({ member: m.member, month: d.month })} title={STATE_LABEL[lang][d.state]}>
                        {d.state === "paid" ? (d.onTime === false ? <ClockIcon size={14} /> : <CheckIcon size={15} />) : d.state === "review" ? "?" : d.state === "late" ? "!" : ""}
                        {turn && <span className="gm-cell-turn" title={t("Receives this month")} />}
                      </button>
                    </td>
                  );
                })}
                <td className="tm-num">{money(m.paidSoFar, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tm-small tm-muted gm-legend"><span className="gm-cell is-paid gm-key"><CheckIcon size={12} /></span> {STATE_LABEL[lang].paid} <span className="gm-cell is-paid gm-key"><ClockIcon size={12} /></span> {t("paid late")} <span className="gm-cell is-review gm-key">?</span> {STATE_LABEL[lang].review} <span className="gm-cell is-late gm-key">!</span> {STATE_LABEL[lang].late} <span className="gm-key gm-key-turn" /> {t("receives this month")}</p>
      {cell && <CellPanel data={data} cell={cell} nameOf={nameOf} onClose={() => setCell(null)} reload={reload} />}
    </div>
  );
}

function CellPanel({ data, cell, nameOf, onClose, reload }) {
  const { t, lang } = useAdminT();
  const { circle, statement } = data;
  const m = statement.members.find((x) => x.member === cell.member);
  const d = m.dues[cell.month];
  const list = data.payments.filter((p) => p.member === cell.member && p.month === cell.month);
  const [form, setForm] = useState({ amount: Math.max(d.due - d.paid, 0) || d.due, method: "cash", note: "" });
  const [error, setError] = useState("");
  const run = async (fn) => { setError(""); try { if ((await fn()) !== false) reload(); } catch (err) { setError(err.message); } };
  const record = (e) => { e.preventDefault(); run(() => api.post(`/admin/circles/${circle.id}/payments`, { member: cell.member, month: cell.month, amount: Number(form.amount), method: form.method, note: form.note })); };
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{nameOf[cell.member]?.name} · {monthName(d.dueDate, lang)}</h2>
        <p className="admin-sub">{t("Due")} {money(d.due, lang)} · {t("paid")} {money(d.paid, lang)} · <span className={`gm-state is-${d.state}`}>{STATE_LABEL[lang][d.state]}</span></p>
        {list.length === 0 && <p className="admin-empty">{t("No payments for this month yet.")}</p>}
        {list.map((p) => (
          <div className="gm-review-row" key={p.id}>
            {p.hasProof ? <ProofImage paymentId={p.id} /> : <span className="gm-proof is-empty">{METHOD_LABEL[lang][p.method]}</span>}
            <div className="gm-review-info">
              <strong>{money(p.amount, lang)} · {METHOD_LABEL[lang][p.method]}</strong>
              <span className="tm-small">{p.status === "confirmed" ? `${t("confirmed")}${p.reviewedBy && p.reviewedBy !== "owner" ? ` (${p.reviewedBy})` : ""}` : p.status === "pending" ? t("waiting for you") : `${t("Rejected")}: ${p.rejectReason}`}</span>
              <span className="tm-small tm-muted">{timeAgo(p.createdAt, lang)}{p.note ? ` · “${p.note}”` : ""}</span>
            </div>
            <div className="actions">
              {p.status === "pending" && <button className="admin-btn admin-btn-primary" onClick={() => run(() => reviewPayment(p, "confirm", t))}>{t("Confirm")}</button>}
              {p.status === "pending" && <button className="admin-btn" onClick={() => run(() => reviewPayment(p, "reject", t))}>{t("Reject")}</button>}
              <button className="admin-btn admin-btn-danger" onClick={() => run(async () => { if (!confirm(t("Delete this payment?"))) return false; await api.del(`/admin/circles/payments/${p.id}`); })}>✕</button>
            </div>
          </div>
        ))}
        {circle.status === "active" && (
          <form className="admin-form gm-record-form" onSubmit={record}>
            <strong>{t("Record a payment you received")}</strong>
            <div className="admin-form-row">
              <label>{t("Amount")}<input className="form-input" type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
              <label>{t("Method")}<select className="form-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{METHODS.map((x) => <option key={x} value={x}>{METHOD_LABEL[lang][x]}</option>)}</select></label>
            </div>
            <label>{t("Note")}<input className="form-input" dir="auto" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} /></label>
            <button type="submit" className="admin-btn admin-btn-primary">{t("Record payment")}</button>
          </form>
        )}
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions"><button className="admin-btn" onClick={onClose}>{t("Close")}</button></div>
      </div>
    </div>
  );
}

// ---- Months & payouts (+ settings, helpers) ----
function Months({ data, members, nameOf, reload, setError }) {
  const { t, lang } = useAdminT();
  const { circle, statement } = data;
  const draft = circle.status === "draft";
  const toSlots = () => circle.slots.map((s) => s.holders.map((h) => ({ member: h.member?.id || h.member, share: h.share, handedAt: h.handedAt })));
  const [slots, setSlots] = useState(toSlots);
  const [settings, setSettings] = useState({ name: circle.name, shareAmount: circle.shareAmount, startMonth: circle.startMonth, payDay: circle.payDay, payoutDay: circle.payoutDay, helpers: circle.helpers.map((h) => h.id || h) });
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setSlots(toSlots()); setDirty(false); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const approved = members.filter((m) => !m.pending && m.active);
  const change = (next) => { setSlots(next); setDirty(true); };
  const paidOut = (i) => slots[i].some((h) => h.handedAt);
  const move = (i, step) => { const n = slots.map((s) => [...s]); [n[i], n[i + step]] = [n[i + step], n[i]]; change(n); };
  const setHolder = (i, j, patch) => change(slots.map((s, a) => (a === i ? s.map((h, b) => (b === j ? { ...h, ...patch } : h)) : s)));
  // A month can be shared by several people: adding a partner splits it equally; each part can
  // then be changed (½ + ¼ + ¼ …) as long as they add up to one share.
  const addPartner = (i) => change(slots.map((s, a) => {
    if (a !== i || s.length >= 10) return s;
    const parts = equalParts(s.length + 1);
    return [...s, { member: "", share: 1 }].map((h, b) => ({ ...h, share: parts[b] }));
  }));
  const removePartner = (i, j) => change(slots.map((s, a) => {
    if (a !== i) return s;
    const rest = s.filter((_, b) => b !== j);
    const parts = equalParts(rest.length);
    return rest.map((h, b) => ({ ...h, share: parts[b] }));
  }));
  const sumOf = (holders) => holders.reduce((x, h) => x + Number(h.share), 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await api.put(`/admin/circles/${circle.id}`, { ...settings, shareAmount: Number(settings.shareAmount), slots: slots.map((s) => s.filter((h) => h.member).map(({ member, share }) => ({ member, share }))) });
      reload();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };
  const hand = async (i, member, handed) => {
    setError("");
    try { await api.post(`/admin/circles/${circle.id}/payouts/${i}/${member}`, { handed }); reload(); } catch (err) { setError(err.message); }
  };
  // Quick fill for a draft: one month per approved member picked in order.
  const addMonth = () => change([...slots, [{ member: "", share: 1 }]]);

  return (
    <div>
      <section className="admin-linkbox admin-form">
        <h2 className="tm-admin-h">{t("Settings")}</h2>
        <div className="admin-form-row">
          <label>{t("Name")}<input className="form-input" dir="auto" value={settings.name} onChange={(e) => { setSettings({ ...settings, name: e.target.value }); setDirty(true); }} maxLength={80} /></label>
          <label>{t("Monthly amount per share (EGP)")}<input className="form-input" type="number" min={1} value={settings.shareAmount} disabled={!draft} onChange={(e) => { setSettings({ ...settings, shareAmount: e.target.value }); setDirty(true); }} /></label>
        </div>
        <div className="admin-form-row">
          <label>{t("First month")}<input className="form-input" type="month" value={settings.startMonth} disabled={!draft} onChange={(e) => { setSettings({ ...settings, startMonth: e.target.value }); setDirty(true); }} /></label>
          <label>{t("Members pay by day")}<input className="form-input" type="number" min={1} max={28} value={settings.payDay} disabled={!draft} onChange={(e) => { setSettings({ ...settings, payDay: Number(e.target.value) }); setDirty(true); }} /></label>
          <label>{t("Payout day")}<input className="form-input" type="number" min={1} max={28} value={settings.payoutDay} onChange={(e) => { setSettings({ ...settings, payoutDay: Number(e.target.value) }); setDirty(true); }} /></label>
        </div>
        <label>{t("Helpers — may confirm this circle's payments (from their own account)")}</label>
        <div className="tm-member-picks">
          {approved.map((m) => (
            <label key={m.id} className={`admin-check tm-pick ${settings.helpers.includes(m.id) ? "is-on" : ""}`}>
              <input type="checkbox" checked={settings.helpers.includes(m.id)} onChange={() => { setSettings({ ...settings, helpers: settings.helpers.includes(m.id) ? settings.helpers.filter((x) => x !== m.id) : [...settings.helpers, m.id] }); setDirty(true); }} />{m.name}
            </label>
          ))}
        </div>
      </section>

      <section className="admin-linkbox">
        <h2 className="tm-admin-h">{t("Who receives which month")}</h2>
        <p className="admin-sub">{draft ? t("One row per month. A member with several shares takes several months (choose them in each); a month can also be shared by several people — “+ Partner”.") : t("Months already paid out can't move. Changes are saved with “Save”.")}</p>
        <div className="gm-slots">
          {slots.map((holders, i) => {
            const mo = statement.months[i];
            const locked = !draft && paidOut(i);
            const total = sumOf(holders);
            const bad = Math.abs(total - 1) > 0.001;
            return (
              <div className={`gm-slot ${locked ? "is-locked" : ""}`} key={i}>
                <div className="gm-slot-month">
                  <strong>{i + 1}</strong>
                  <span className="tm-small">{mo ? monthName(mo.payoutDate, lang) : ""}</span>
                  {mo && <span className="tm-small tm-muted">{money(statement.pot, lang)}</span>}
                </div>
                <div className="gm-slot-holders">
                  {holders.map((h, j) => (
                    <div className="gm-holder" key={j}>
                      <select className="form-input" value={h.member} disabled={locked} onChange={(e) => setHolder(i, j, { member: e.target.value })}>
                        <option value="">{t("— choose a member —")}</option>
                        {approved.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      {holders.length > 1 && (
                        <select className="form-input gm-part" value={PARTS.find(([v]) => Math.abs(v - h.share) < 0.001)?.[0] ?? h.share} disabled={locked} onChange={(e) => setHolder(i, j, { share: Number(e.target.value) })} aria-label={t("Part of the month")}>
                          {PARTS.map(([v, label]) => <option key={label} value={v}>{label}</option>)}
                          {!PARTS.some(([v]) => Math.abs(v - h.share) < 0.001) && <option value={h.share}>{shareText(h.share)}</option>}
                        </select>
                      )}
                      {holders.length > 1 && <span className="tm-small tm-muted">{money(Math.round(statement.pot * h.share), lang)}</span>}
                      {holders.length > 1 && !locked && <button type="button" className="tm-icon-btn" onClick={() => removePartner(i, j)} aria-label={t("Remove partner")}>✕</button>}
                      {!draft && mo && h.member && (() => {
                        const real = mo.holders.find((x) => x.member === h.member);
                        if (!real) return null;
                        return real.receivedAt ? <span className="gm-state is-paid">{t("received")}</span>
                          : real.handedAt ? (<><span className="gm-state is-review">{t("handed — waiting for the member")}</span><button className="tm-link-btn" onClick={() => hand(i, h.member, false)}>{t("Undo")}</button></>)
                            : <button className="admin-btn" onClick={() => hand(i, h.member, true)}>{t("Mark handed over")} ({money(real.amount, lang)})</button>;
                      })()}
                    </div>
                  ))}
                  {bad && <span className="admin-error tm-small">{t("The parts add up to {n} — they must make one full share.", { n: shareText(total) })}</span>}
                </div>
                {!locked && (
                  <div className="actions">
                    {holders.length < 10 && <button className="admin-btn" onClick={() => addPartner(i)} title={t("Share this month with another member")}>{t("+ Partner")}</button>}
                    <button className="admin-btn" onClick={() => move(i, -1)} disabled={i === 0 || (!draft && paidOut(i - 1))}>↑</button>
                    <button className="admin-btn" onClick={() => move(i, 1)} disabled={i === slots.length - 1 || (!draft && paidOut(i + 1))}>↓</button>
                    {draft && <button className="admin-btn admin-btn-danger" onClick={() => change(slots.filter((_, a) => a !== i))}>✕</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {draft && <button className="admin-btn" onClick={addMonth}>{t("+ Add month")}</button>}
        {draft && slots.length > 0 && <p className="admin-sub">{t("{n} months → each full share pays {a} a month and receives {b}.", { n: slots.length, a: money(settings.shareAmount, lang), b: money(settings.shareAmount * slots.length, lang) })}</p>}
      </section>
      <div className="admin-form-actions pd-save-bar">
        {dirty && <span className="admin-sub">{t("You have unsaved changes.")}</span>}
        <button className="admin-btn admin-btn-primary" onClick={save} disabled={saving}>{saving ? t("Saving…") : t("Save")}</button>
      </div>
    </div>
  );
}

// ---- Requests & log ----
function More({ data, reload }) {
  const { t, lang } = useAdminT();
  const answer = async (r, status) => {
    const reply = window.prompt(status === "accepted" ? t("A reply to the member (e.g. the new month)") : t("Why not? (the member sees this)"));
    if (reply === null) return;
    await api.post(`/admin/circles/requests/${r.id}`, { status, reply });
    reload();
  };
  return (
    <div>
      <section className="admin-linkbox">
        <h2 className="tm-admin-h">{t("Early-turn requests")}</h2>
        {data.requests.length === 0 && <p className="admin-empty">{t("No requests.")}</p>}
        {data.requests.map((r) => (
          <div className="gm-review-row" key={r.id}>
            <div className="gm-review-info">
              <strong>{r.member?.name}</strong>
              <span dir="auto">“{r.reason}”</span>
              <span className="tm-small tm-muted">{timeAgo(r.createdAt, lang)}{r.status !== "open" ? ` · ${r.status === "accepted" ? t("Accepted") : t("Declined")}${r.reply ? `: ${r.reply}` : ""}` : ""}</span>
            </div>
            {r.status === "open" && (
              <div className="actions">
                <button className="admin-btn admin-btn-primary" onClick={() => answer(r, "accepted")}>{t("Accept")}</button>
                <button className="admin-btn" onClick={() => answer(r, "declined")}>{t("Decline")}</button>
              </div>
            )}
          </div>
        ))}
      </section>
      <section className="admin-linkbox">
        <h2 className="tm-admin-h">{t("Log")}</h2>
        <ul className="tm-activity">
          {data.log.map((l) => (
            <li key={l.id}>
              <span><strong>{l.actor === "owner" ? t("You") : l.actor}</strong> {t(LOG_ACTIONS[l.action] || l.action)} <span dir="auto">“{l.detail}”</span></span>
              <span className="tm-muted tm-small" title={new Date(l.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}>{timeAgo(l.createdAt, lang)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---- Printable schedule (shown only when printing) ----
function PrintSchedule({ data, nameOf }) {
  const { t, lang } = useAdminT();
  const { circle, statement } = data;
  return (
    <section className="gm-print-only gm-sheet">
      <h1>{circle.name}</h1>
      <p>{money(circle.shareAmount, lang)} {t("a month per share")} · {circle.slots.length} {t("months")} · {t("pot")} {money(statement.pot, lang)}</p>
      <table className="gm-print-table">
        <thead><tr><th>#</th><th>{t("Month")}</th><th>{t("Pay by")}</th><th>{t("Receives")}</th><th>{t("Payout date")}</th><th>{t("Amount")}</th></tr></thead>
        <tbody>
          {statement.months.map((m) => (
            <tr key={m.index}>
              <td>{m.index + 1}</td>
              <td>{monthName(m.dueDate, lang)}</td>
              <td>{day(m.dueDate, lang)}</td>
              <td>{m.holders.map((h) => `${nameOf[h.member]?.name || "—"}${h.share < 1 ? ` (${shareText(h.share)})` : ""}`).join(" + ")}</td>
              <td>{day(m.payoutDate, lang)}</td>
              <td>{m.holders.map((h) => money(h.amount, lang)).join(" + ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="gm-print-table">
        <thead><tr><th>{t("Member")}</th><th>{t("Shares")}</th><th>{t("Pays a month")}</th><th>{t("Receives in total")}</th></tr></thead>
        <tbody>
          {statement.members.map((m) => (
            <tr key={m.member}><td>{nameOf[m.member]?.name}</td><td>{shareText(m.share)}</td><td>{money(m.monthlyDue, lang)}</td><td>{money(m.totalToReceive, lang)}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---- Month summary for the WhatsApp group ----
function GroupSummary({ data, nameOf, onClose }) {
  const { t, lang } = useAdminT();
  const { circle, statement } = data;
  const [month, setMonth] = useState(statement.currentMonth);
  const [names, setNames] = useState(false);
  const [copied, setCopied] = useState(false);
  const mo = statement.months[month];
  const paid = statement.members.filter((m) => m.dues[month].state === "paid");
  const missing = statement.members.filter((m) => m.dues[month].state !== "paid");
  const holders = mo.holders.map((h) => nameOf[h.member]?.name).join(lang === "ar" ? " و" : " & ");
  const text = lang === "ar"
    ? [`جمعية «${circle.name}» — ${monthName(mo.dueDate, "ar")}`, `- دفع ${paid.length} من ${statement.members.length}`,
      names && missing.length ? `- لسه: ${missing.map((m) => nameOf[m.member]?.name).join("، ")}` : null,
      `- القبض لـ ${holders} يوم ${day(mo.payoutDate, "ar")}`, `- ادفع وارفع صورة التحويل: ${portal()}`].filter(Boolean).join("\n")
    : [`"${circle.name}" — ${monthName(mo.dueDate, "en")}`, `- ${paid.length} of ${statement.members.length} paid`,
      names && missing.length ? `- Still to pay: ${missing.map((m) => nameOf[m.member]?.name).join(", ")}` : null,
      `- ${holders} receive(s) on ${day(mo.payoutDate, "en")}`, `- Pay and upload the screenshot: ${portal()}`].filter(Boolean).join("\n");
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt(t("Copy:"), text); } };
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-form" onClick={(e) => e.stopPropagation()}>
        <h2>{t("Group summary")}</h2>
        <div className="admin-form-row">
          <label>{t("Month")}<select className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{statement.months.map((m) => <option key={m.index} value={m.index}>{monthName(m.dueDate, lang)}</option>)}</select></label>
          <label className="admin-check"><input type="checkbox" checked={names} onChange={(e) => setNames(e.target.checked)} />{t("Show the names of those who haven't paid")}</label>
        </div>
        <textarea className="form-input" dir="auto" rows={7} readOnly value={text} />
        <div className="admin-form-actions">
          <button className="admin-btn" onClick={onClose}>{t("Close")}</button>
          <button className="admin-btn" onClick={copy}>{copied ? t("Copied") : t("Copy")}</button>
          <a className="admin-btn admin-btn-primary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">{t("Send on WhatsApp")}</a>
        </div>
      </div>
    </div>
  );
}

// ---- Excel statement: one sheet per member × month, one for the payouts ----
async function downloadStatement(data, nameOf, lang, t) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const { circle, statement } = data;
  const bold = (value) => ({ value, fontWeight: "bold" });
  const head = [bold(t("Member")), bold(t("Phone")), bold(t("Shares")), bold(t("Pays a month")), ...statement.months.map((m) => bold(monthName(m.dueDate, lang))), bold(t("Paid")), bold(t("Late months"))];
  const rows = statement.members.map((m) => [
    { value: nameOf[m.member]?.name || "" }, { value: nameOf[m.member]?.phone || "" }, { value: m.share, type: Number }, { value: m.monthlyDue, type: Number },
    ...m.dues.map((d) => ({ value: d.state === "paid" ? d.paid : `${STATE_LABEL[lang][d.state]}${d.paid ? ` (${d.paid})` : ""}`, ...(d.state === "paid" ? { type: Number } : {}) })),
    { value: m.paidSoFar, type: Number }, { value: m.lateCount, type: Number },
  ]);
  const payoutHead = [bold("#"), bold(t("Month")), bold(t("Receives")), bold(t("Amount")), bold(t("Payout date")), bold(t("Handed over")), bold(t("Received"))];
  const payoutRows = statement.months.flatMap((m) => m.holders.map((h) => [
    { value: m.index + 1, type: Number }, { value: monthName(m.dueDate, lang) }, { value: nameOf[h.member]?.name || "" }, { value: h.amount, type: Number },
    { value: m.payoutDate }, { value: h.handedAt ? h.handedAt.slice(0, 10) : "" }, { value: h.receivedAt ? h.receivedAt.slice(0, 10) : "" },
  ]));
  const rtl = lang === "ar";
  await writeExcelFile([
    { data: [head, ...rows], sheet: t("Payments"), stickyRowsCount: 1, rightToLeft: rtl, columns: head.map((_, i) => ({ width: i < 2 ? 22 : 14 })) },
    { data: [payoutHead, ...payoutRows], sheet: t("Payouts"), stickyRowsCount: 1, rightToLeft: rtl, columns: payoutHead.map(() => ({ width: 18 })) },
  ]).toFile(`${circle.name}.xlsx`);
}
