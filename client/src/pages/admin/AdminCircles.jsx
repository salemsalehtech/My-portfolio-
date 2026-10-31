// AdminCircles.jsx — the owner's savings circles (/admin/circles), loaded on demand. Tabs
// (?tab=… picks one):
//   Circles  — every circle with this month's progress; "New circle" makes a draft (AdminCircle.jsx)
//   Inbox    — payments waiting for confirmation (with the screenshot) and early-turn requests
//   Members  — accounts (create, approve sign-ups, private notes + guarantor, disable, reset
//              password, delete), each member's commitment record, the waiting list, invite links
//   Payment  — where members send money (InstaPay, Vodafone Cash, an InstaPay link for a QR code)
//   Log      — everything that happened, newest first
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, fetchImageUrl } from "../../lib/api";
import { money, day, METHOD_LABEL, whatsappLink } from "../../lib/circles";
import { initials, timeAgo } from "../../lib/team";
import { useAdminT } from "../../lib/adminI18n";
import { pushState, enablePush } from "../../lib/webPush";

const portal = () => `${window.location.origin}${window.location.pathname}#/gam3eya`;
const joinLink = (token) => `${portal()}/join/${token}`;
const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminCircles() {
  const { t } = useAdminT();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "circles";
  const setTab = (next) => setParams(next === "circles" ? {} : { tab: next }, { replace: true });
  return (
    <div className="tm-admin">
      <h1>{t("Savings circles")}</h1>
      <div className="admin-toolbar">
        {[["circles", "Circles"], ["inbox", "To review"], ["members", "Members"], ["payment", "Payment info"], ["log", "Log"]].map(([key, label]) => (
          <button key={key} className={`admin-btn ${tab === key ? "admin-btn-primary" : ""}`} onClick={() => setTab(key)}>{t(label)}</button>
        ))}
      </div>
      {tab === "circles" && <Circles />}
      {tab === "inbox" && <Inbox />}
      {tab === "members" && <Members />}
      {tab === "payment" && <PaymentInfo />}
      {tab === "log" && <Log />}
    </div>
  );
}

// ---- Circles ----
function Circles() {
  const { t, lang } = useAdminT();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/admin/circles").then(setList).catch((err) => setError(err.message)); }, []);
  const create = async (e) => {
    e.preventDefault();
    setError("");
    try { const c = await api.post("/admin/circles", { ...form, shareAmount: Number(form.shareAmount) }); navigate(`/admin/circles/${c.id}`); } catch (err) { setError(err.message); }
  };
  const STATUS = { draft: t("Draft"), active: t("Running"), finished: t("Finished") };
  return (
    <div>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={() => setForm({ name: "", shareAmount: 1000, startMonth: thisMonth(), payDay: 1, payoutDay: 5 })}>{t("+ New circle")}</button>
        <OwnerPush />
      </div>
      {form && (
        <form className="admin-form admin-linkbox" onSubmit={create}>
          <div className="admin-form-row">
            <label>{t("Name")}<input className="form-input" dir="auto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} required placeholder={t("e.g. Family circle 2026")} /></label>
            <label>{t("Monthly amount per share (EGP)")}<input className="form-input" type="number" min={1} value={form.shareAmount} onChange={(e) => setForm({ ...form, shareAmount: e.target.value })} required /></label>
          </div>
          <div className="admin-form-row">
            <label>{t("First month")}<input className="form-input" type="month" value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: e.target.value })} required /></label>
            <label>{t("Members pay by day")}<input className="form-input" type="number" min={1} max={28} value={form.payDay} onChange={(e) => setForm({ ...form, payDay: Number(e.target.value) })} /></label>
            <label>{t("Payout day")}<input className="form-input" type="number" min={1} max={28} value={form.payoutDay} onChange={(e) => setForm({ ...form, payoutDay: Number(e.target.value) })} /></label>
          </div>
          {error && <p className="admin-error">{error}</p>}
          <div className="admin-form-actions">
            <button type="button" className="admin-btn" onClick={() => setForm(null)}>{t("Cancel")}</button>
            <button type="submit" className="admin-btn admin-btn-primary">{t("Create and add members")}</button>
          </div>
        </form>
      )}
      {list === null && <p>{error || t("Loading…")}</p>}
      {list && list.length === 0 && <p className="admin-empty">{t("No circles yet.")}</p>}
      <div className="gm-admin-cards">
        {list && list.map((c) => {
          const pct = c.members ? Math.round((c.paidThisMonth / c.members) * 100) : 0;
          return (
            <Link key={c.id} className={`admin-linkbox gm-admin-card is-${c.status}`} to={`/admin/circles/${c.id}`}>
              <span className="gm-admin-card-top"><strong dir="auto">{c.name}</strong><span className={`tm-pill ${c.status === "finished" ? "is-off" : ""}`}>{STATUS[c.status]}</span></span>
              <span className="tm-muted tm-small">{money(c.shareAmount, lang)} × {c.months} · {t("pot")} {money(c.pot, lang)} · {c.members} {t("members")}</span>
              {c.status === "active" && (
                <>
                  <span className="tm-small">{t("This month: {paid} of {total} paid", { paid: c.paidThisMonth, total: c.members })}</span>
                  <span className="tm-bar"><span style={{ width: `${pct}%` }} /></span>
                  <span className="tm-small">
                    {c.toReview > 0 && <span className="tm-pill">{t("{n} to review", { n: c.toReview })}</span>}
                    {c.lateNow > 0 && <span className="tm-pill is-late">{t("{n} late", { n: c.lateNow })}</span>}
                  </span>
                </>
              )}
              <span className="tm-muted tm-small">{c.startMonth} → {c.endMonth}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// The owner's phone notifications (new payments, requests, sign-ups).
function OwnerPush() {
  const { t } = useAdminT();
  const [state, setState] = useState("checking");
  useEffect(() => { pushState().then(setState).catch(() => setState("unsupported")); }, []);
  if (state === "on") return <span className="admin-sub">🔔 {t("Phone notifications on")}</span>;
  if (state !== "off") return null;
  return <button className="admin-btn" onClick={() => enablePush("/admin/circles").then(() => setState("on")).catch(() => setState("blocked"))}>🔔 {t("Notify me on this device")}</button>;
}

// ---- Inbox: payments to confirm + early-turn requests ----
export function ProofImage({ paymentId }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let made = "";
    fetchImageUrl(`/admin/circles/payments/${paymentId}/proof`).then((u) => { made = u; setUrl(u); }).catch(() => {});
    return () => { if (made) URL.revokeObjectURL(made); };
  }, [paymentId]);
  return url ? <a className="gm-proof" href={url} target="_blank" rel="noreferrer"><img src={url} alt="" /></a> : <span className="gm-proof is-empty" />;
}

export async function reviewPayment(p, decision, t) {
  const reason = decision === "reject" ? window.prompt(t("Why is this payment rejected? (the member sees this)")) : "";
  if (decision === "reject" && !reason) return false;
  await api.post(`/admin/circles/payments/${p.id}/review`, { decision, reason });
  return true;
}

function Inbox() {
  const { t, lang } = useAdminT();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/admin/circles/inbox/all").then(setData).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  const decide = async (p, d) => { try { if (await reviewPayment(p, d, t)) load(); } catch (err) { setError(err.message); } };
  const answer = async (r, status) => {
    const reply = window.prompt(status === "accepted" ? t("A reply to the member (e.g. the new month)") : t("Why not? (the member sees this)")) ?? null;
    if (reply === null) return;
    await api.post(`/admin/circles/requests/${r.id}`, { status, reply });
    load();
  };
  if (!data) return <p className={error ? "admin-error" : ""}>{error || t("Loading…")}</p>;
  return (
    <div>
      {error && <p className="admin-error">{error}</p>}
      <section className="admin-linkbox">
        <h2 className="tm-admin-h">{t("Payments to confirm")} <span className="tm-count">{data.payments.length}</span></h2>
        {data.payments.length === 0 && <p className="admin-empty">{t("Nothing to review.")}</p>}
        {data.payments.map((p) => (
          <div className="gm-review-row" key={p.id}>
            {p.hasProof ? <ProofImage paymentId={p.id} /> : <span className="gm-proof is-empty">{METHOD_LABEL[lang][p.method]}</span>}
            <div className="gm-review-info">
              <strong>{p.member?.name}</strong>
              <span>{money(p.amount, lang)} · {METHOD_LABEL[lang][p.method]} · {p.circle?.name} · {t("month {n}", { n: p.month + 1 })}</span>
              <span className="tm-small tm-muted">{timeAgo(p.createdAt, lang)}{p.note ? ` · “${p.note}”` : ""}</span>
            </div>
            <div className="actions">
              <button className="admin-btn admin-btn-primary" onClick={() => decide(p, "confirm")}>{t("Confirm ✓")}</button>
              <button className="admin-btn" onClick={() => decide(p, "reject")}>{t("Reject")}</button>
            </div>
          </div>
        ))}
      </section>
      <section className="admin-linkbox">
        <h2 className="tm-admin-h">{t("Early-turn requests")} <span className="tm-count">{data.requests.length}</span></h2>
        {data.requests.length === 0 && <p className="admin-empty">{t("No open requests.")}</p>}
        {data.requests.map((r) => (
          <div className="gm-review-row" key={r.id}>
            <div className="gm-review-info">
              <strong>{r.member?.name} · {r.circle?.name}</strong>
              <span dir="auto">“{r.reason}”</span>
              <span className="tm-small tm-muted">{timeAgo(r.createdAt, lang)} · {t("To change the order, edit the circle's months.")}</span>
            </div>
            <div className="actions">
              <Link className="admin-btn" to={`/admin/circles/${r.circle?.id}`}>{t("Open circle")}</Link>
              <button className="admin-btn admin-btn-primary" onClick={() => answer(r, "accepted")}>{t("Accept")}</button>
              <button className="admin-btn" onClick={() => answer(r, "declined")}>{t("Decline")}</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// ---- Members ----
const tempPassword = () => `gm-${1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000)}-${(crypto.getRandomValues(new Uint32Array(1))[0] % 9000) + 1000}`;

function Members() {
  const { t, lang } = useAdminT();
  const [members, setMembers] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/admin/circles/members/all").then(setMembers).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try { const m = await api.post("/admin/circles/members", form); setCreated({ name: m.name, phone: m.phone, password: form.password }); setForm(null); load(); } catch (err) { setError(err.message); }
  };
  const save = async (e) => {
    e.preventDefault();
    setError("");
    try { await api.put(`/admin/circles/members/${editing.id}`, editing); setEditing(null); load(); } catch (err) { setError(err.message); }
  };
  const act = async (fn) => { setError(""); try { await fn(); load(); } catch (err) { setError(err.message); } };
  const reset = (m) => act(async () => {
    if (!confirm(t("Give {name} a new temporary password?", { name: m.name }))) return;
    const password = tempPassword();
    await api.post(`/admin/circles/members/${m.id}/password`, { password });
    setCreated({ name: m.name, phone: m.phone, password });
  });
  const loginText = (c) => `${t("Savings circles")}: ${portal()}\n${t("Phone")}: ${c.phone}\n${t("Temporary password")}: ${c.password}`;

  const waiting = (members || []).filter((m) => m.waitlist?.on);
  return (
    <div>
      <Invites />
      {created && (
        <div className="admin-notice">
          <strong>{t("Login for {name}", { name: created.name })}</strong> — {t("Phone")} <code>{created.phone}</code>, {t("Temporary password")} <code>{created.password}</code>.{" "}
          <a className="admin-btn" href={whatsappLink(created.phone, loginText(created))} target="_blank" rel="noreferrer">{t("Send on WhatsApp")}</a>{" "}
          <button className="admin-btn" onClick={() => setCreated(null)}>{t("Done")}</button>
        </div>
      )}
      {waiting.length > 0 && (
        <section className="admin-linkbox">
          <h2 className="tm-admin-h">{t("Waiting list for the next circle")} <span className="tm-count">{waiting.length}</span></h2>
          {waiting.map((m) => (
            <div className="gm-review-row" key={m.id}>
              <div className="gm-review-info"><strong>{m.name}</strong><span className="tm-small tm-muted">{m.waitlist.note || "—"} · {m.waitlist.at ? day(m.waitlist.at.slice(0, 10), lang) : ""}</span></div>
              <button className="admin-btn" onClick={() => act(() => api.post(`/admin/circles/members/${m.id}/waitlist`))}>{t("Remove from list")}</button>
            </div>
          ))}
        </section>
      )}
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={() => setForm({ name: "", phone: "", password: tempPassword() })}>{t("+ New member")}</button>
      </div>
      {error && <p className="admin-error">{error}</p>}
      {form && (
        <form className="admin-form admin-linkbox" onSubmit={create}>
          <div className="admin-form-row">
            <label>{t("Full name")}<input className="form-input" dir="auto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} required /></label>
            <label>{t("Phone")}<input className="form-input" dir="ltr" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="01xxxxxxxxx" /></label>
            <label>{t("Temporary password")}<input className="form-input" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></label>
          </div>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn" onClick={() => setForm(null)}>{t("Cancel")}</button>
            <button type="submit" className="admin-btn admin-btn-primary">{t("Create member")}</button>
          </div>
        </form>
      )}
      {members === null ? <p>{t("Loading…")}</p> : (
        <table className="admin-table">
          <thead><tr><th>{t("Member")}</th><th>{t("Phone")}</th><th>{t("Commitment")}</th><th>{t("Private notes")}</th><th></th></tr></thead>
          <tbody>
            {members.length === 0 && <tr><td colSpan={5} className="admin-empty">{t("No members yet.")}</td></tr>}
            {members.map((m) => {
              const r = m.record || {};
              const total = r.onTime + r.lateButPaid + r.lateNow;
              const score = total ? Math.round((r.onTime / total) * 100) : null;
              return (
                <tr key={m.id} className={m.pending ? "tm-pending" : m.active ? "" : "tm-inactive"}>
                  <td><span className="tm-avatar">{initials(m.name)}</span> {m.name}{m.pending && <div><span className="tm-pill">{t("Waiting for your approval")}</span></div>}{m.goal && <div className="tm-small tm-muted">🎯 {m.goal}</div>}</td>
                  <td><a dir="ltr" href={whatsappLink(m.phone, "")} target="_blank" rel="noreferrer">{m.phone}</a></td>
                  <td className="gm-record">
                    {score === null ? <span className="tm-muted">—</span> : <span className={`gm-score ${score >= 90 ? "is-good" : score >= 60 ? "is-mid" : "is-bad"}`}>{score}%</span>}
                    {total > 0 && <span className="tm-small tm-muted">{t("{a} on time · {b} late · {c} unpaid", { a: r.onTime, b: r.lateButPaid, c: r.lateNow })}</span>}
                  </td>
                  <td className="tm-small">{m.notes || ""}{m.guarantorName && <div>🤝 {m.guarantorName} <span dir="ltr">{m.guarantorPhone}</span></div>}</td>
                  <td className="actions">
                    {m.pending ? (
                      <>
                        <button className="admin-btn admin-btn-primary" onClick={() => act(() => api.post(`/admin/circles/members/${m.id}/approve`))}>{t("Approve ✓")}</button>
                        <button className="admin-btn admin-btn-danger" onClick={() => act(async () => { if (confirm(t("Reject {name}'s sign-up? The account will be deleted.", { name: m.name }))) await api.del(`/admin/circles/members/${m.id}`); })}>{t("Reject")}</button>
                      </>
                    ) : (<>
                      <button className="admin-btn" onClick={() => setEditing({ ...m })}>{t("Edit")}</button>
                      <button className="admin-btn" onClick={() => reset(m)}>{t("Reset password")}</button>
                      <button className="admin-btn" onClick={() => act(() => api.put(`/admin/circles/members/${m.id}`, { active: !m.active }))}>{m.active ? t("Disable") : t("Enable")}</button>
                      <button className="admin-btn admin-btn-danger" onClick={() => act(async () => { if (confirm(t("Delete {name}?", { name: m.name }))) await api.del(`/admin/circles/members/${m.id}`); })}>{t("Delete")}</button>
                    </>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {editing && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <form className="admin-modal admin-form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{editing.name}</h2>
            <div className="admin-form-row">
              <label>{t("Full name")}<input className="form-input" dir="auto" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={80} required /></label>
              <label>{t("Phone")}<input className="form-input" dir="ltr" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} required /></label>
            </div>
            <label>{t("Private notes (only you see them)")}<textarea className="form-input" dir="auto" rows={3} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} maxLength={2000} /></label>
            <div className="admin-form-row">
              <label>{t("Guarantor name")}<input className="form-input" dir="auto" value={editing.guarantorName} onChange={(e) => setEditing({ ...editing, guarantorName: e.target.value })} maxLength={80} /></label>
              <label>{t("Guarantor phone")}<input className="form-input" dir="ltr" value={editing.guarantorPhone} onChange={(e) => setEditing({ ...editing, guarantorPhone: e.target.value })} maxLength={20} /></label>
            </div>
            {error && <p className="admin-error">{error}</p>}
            <div className="admin-form-actions">
              <button type="button" className="admin-btn" onClick={() => setEditing(null)}>{t("Cancel")}</button>
              <button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const STATE_LABEL = { active: "Active", used: "Used up", expired: "Expired", revoked: "Stopped" };
function Invites() {
  const { t, lang } = useAdminT();
  const [invites, setInvites] = useState([]);
  const [form, setForm] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [copied, setCopied] = useState(false);
  const load = () => api.get("/admin/circles/invites/all").then(setInvites).catch(() => {});
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    const { invite, token } = await api.post("/admin/circles/invites", form);
    setFresh({ link: joinLink(token), label: invite.label });
    setForm(null);
    load();
  };
  const copy = async () => { try { await navigator.clipboard.writeText(fresh.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt(t("Copy:"), fresh.link); } };
  const shareText = (link) => `${t("Join our savings circle — create your account here:")}\n${link}`;
  return (
    <section className="admin-linkbox tm-invites">
      <div className="tm-invites-head">
        <div>
          <h2 className="tm-admin-h">{t("Invite links")}</h2>
          <p className="admin-sub">{t("Members sign up with their phone number, then you approve them.")}</p>
        </div>
        {!form && <button className="admin-btn admin-btn-primary" onClick={() => { setFresh(null); setForm({ label: "", maxUses: 1, days: 7 }); }}>{t("+ Invite link")}</button>}
      </div>
      {form && (
        <form className="admin-form tm-invite-form" onSubmit={create}>
          <div className="admin-form-row">
            <label>{t("Note (only you see it)")}<input className="form-input" dir="auto" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} maxLength={80} /></label>
            <label>{t("How many people can use it")}<input className="form-input" type="number" min={1} max={50} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} /></label>
            <label>{t("Works for (days)")}<input className="form-input" type="number" min={1} max={30} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} /></label>
          </div>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn" onClick={() => setForm(null)}>{t("Cancel")}</button>
            <button type="submit" className="admin-btn admin-btn-primary">{t("Create link")}</button>
          </div>
        </form>
      )}
      {fresh && (
        <div className="admin-notice">
          <div className="admin-linkrow">
            <input className="form-input" dir="ltr" readOnly value={fresh.link} onFocus={(e) => e.target.select()} />
            <button className="admin-btn admin-btn-primary" onClick={copy}>{copied ? t("Copied ✓") : t("Copy")}</button>
            <a className="admin-btn" href={`https://wa.me/?text=${encodeURIComponent(shareText(fresh.link))}`} target="_blank" rel="noreferrer">{t("Send on WhatsApp")}</a>
          </div>
          <p className="admin-sub">{t("Copy it now — for safety it is shown only once.")}</p>
        </div>
      )}
      {invites.length > 0 && (
        <table className="admin-table tm-invite-table">
          <thead><tr><th>{t("Note")}</th><th>{t("Status")}</th><th>{t("Used")}</th><th>{t("Ends")}</th><th>{t("Joined")}</th><th></th></tr></thead>
          <tbody>
            {invites.map((i) => (
              <tr key={i.id} className={i.state === "active" ? "" : "tm-inactive"}>
                <td dir="auto">{i.label || "—"}</td>
                <td><span className={`tm-pill ${i.state === "active" ? "" : "is-off"}`}>{t(STATE_LABEL[i.state])}</span></td>
                <td>{i.uses}/{i.maxUses}</td>
                <td>{day(i.expiresAt.slice(0, 10), lang)}</td>
                <td>{i.members.join("، ") || "—"}</td>
                <td className="actions">{i.state === "active" && <button className="admin-btn admin-btn-danger" onClick={async () => { await api.del(`/admin/circles/invites/${i.id}`); load(); }}>{t("Stop")}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ---- Payment info ----
function PaymentInfo() {
  const { t } = useAdminT();
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => { api.get("/admin/circles/settings/pay").then(setForm); }, []);
  if (!form) return <p>{t("Loading…")}</p>;
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setStatus(""); };
  const save = async (e) => {
    e.preventDefault();
    try { setForm(await api.put("/admin/circles/settings/pay", form)); setStatus(t("Saved ✓")); } catch (err) { setStatus(err.message); }
  };
  return (
    <form className="admin-form admin-linkbox" onSubmit={save}>
      <p className="admin-sub">{t("Members see this with copy buttons when they press “Pay now”.")}</p>
      <div className="admin-form-row">
        <label>{t("InstaPay address")}<input className="form-input" dir="ltr" value={form.instapay} onChange={set("instapay")} maxLength={120} placeholder="name@instapay" /></label>
        <label>{t("Vodafone Cash number")}<input className="form-input" dir="ltr" value={form.vodafone} onChange={set("vodafone")} maxLength={20} placeholder="010xxxxxxxx" /></label>
      </div>
      <label>{t("InstaPay payment link (optional — shown as a QR code)")}<input className="form-input" dir="ltr" value={form.instapayLink} onChange={set("instapayLink")} maxLength={300} placeholder="https://ipn.eg/S/…" /></label>
      <label>{t("A note for members (optional)")}<textarea className="form-input" dir="auto" rows={2} value={form.payNote} onChange={set("payNote")} maxLength={500} /></label>
      <div className="admin-form-actions">{status && <span className="admin-sub">{status}</span>}<button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button></div>
    </form>
  );
}

// ---- Log ----
export const LOG_ACTIONS = {
  created: "created the circle", edited: "edited the circle", started: "started the circle", finished: "finished the circle", deleted: "deleted a circle",
  payment_sent: "sent a payment", payment_confirmed: "confirmed a payment", payment_rejected: "rejected a payment", payment_recorded: "recorded a payment", payment_deleted: "deleted a payment",
  payout_handed: "handed over a payout", payout_unmarked: "un-marked a payout", payout_received: "confirmed receiving the payout",
  early_request: "asked for an early turn", request_accepted: "accepted a request", request_declined: "declined a request",
  signed_up: "signed up", member_approved: "approved a member",
};
function Log() {
  const { t, lang } = useAdminT();
  const [log, setLog] = useState(null);
  useEffect(() => { api.get("/admin/circles/log/all").then(setLog); }, []);
  if (!log) return <p>{t("Loading…")}</p>;
  return (
    <section className="admin-linkbox">
      {log.length === 0 && <p className="admin-empty">{t("Nothing yet.")}</p>}
      <ul className="tm-activity">
        {log.map((l) => (
          <li key={l.id}>
            <span><strong>{l.actor === "owner" ? t("You") : l.actor}</strong> {t(LOG_ACTIONS[l.action] || l.action)} <span dir="auto">“{l.detail}”</span>{l.circle ? <span className="tm-muted"> · {l.circle.name}</span> : null}</span>
            <span className="tm-muted tm-small" title={new Date(l.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}>{timeAgo(l.createdAt, lang)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
