// CirclePortal.jsx — the members' side of the savings circles (/#/gam3eya/*), loaded on demand.
// It looks like the team portal (the tm-* styles) and is branded as the company.
//
// A member signs up with an invite link (/gam3eya/join/<token>, then waits for approval) or gets
// an account from the owner, and logs in with their phone number. The token is kept in
// localStorage ("circleToken"; lib/api.js sends it on /circle/* calls). Then:
//   /gam3eya                     → CircleHome: my circles, payments, turns, reminders
//   /gam3eya/receipt/:id         → a printable receipt of one payment
//   /gam3eya/certificate/:id     → a printable certificate when a circle has finished
// Arabic by default (remembered), light / dark like the site, installable as an app
// (public/gam3eya.webmanifest) with phone notifications (lib/webPush.js).
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useMatch } from "react-router-dom";
import { loadRules } from "../../lib/rules";
import { api } from "../../lib/api";
import { COMPANY } from "../../lib/brand";
import { initials } from "../../lib/team";
import { CIRCLE_COPY, CIRCLE_SERVER_AR, day } from "../../lib/circles";
import { addCirclesManifest } from "../../lib/webPush";
import { useSite } from "../../context/SiteContext";
import { SunIcon, MoonIcon, GlobeIcon, KeyIcon, LogoutIcon, ExternalIcon, CheckCircleIcon } from "../../components/team/icons";
import CircleBell from "../../components/circles/CircleBell";
import CircleHome from "./CircleHome";
import Toaster from "../../components/Toaster";
import { CircleReceipt, CircleCertificate } from "./CirclePrint";
import BrandMark from "../../components/BrandMark";
import BrandLoader from "../../components/BrandLoader";
import BrandBackdrop from "../../components/BrandBackdrop";

const CircleContext = createContext(null);
export const useCircle = () => useContext(CircleContext);

const readLang = () => { try { return localStorage.getItem("circleLang") === "en" ? "en" : "ar"; } catch { return "ar"; } };

export default function CirclePortal() {
  const [lang, setLangState] = useState(readLang);
  const [member, setMember] = useState(null);
  const [status, setStatus] = useState(() => (localStorage.getItem("circleToken") ? "checking" : "out"));
  const [expired, setExpired] = useState(false);
  const t = CIRCLE_COPY[lang];
  const join = useMatch("/gam3eya/join/:token");
  const msg = (text) => (lang === "ar" ? CIRCLE_SERVER_AR[text] || text : text);
  const setLang = (next) => { setLangState(next); try { localStorage.setItem("circleLang", next); } catch { /* private mode */ } };

  useEffect(() => addCirclesManifest(), []);
  useEffect(() => { document.title = `${t.portal} · ${COMPANY}`; }, [t.portal]);
  useEffect(() => { loadRules(); }, []); // upload limits (lib/rules.js)
  useEffect(() => {
    if (status !== "checking") return;
    api.get("/circle/me").then((m) => { setMember(m); setStatus("in"); }).catch(() => setStatus("out"));
  }, [status]);
  useEffect(() => {
    const onExpired = () => { setMember(null); setStatus("out"); setExpired(true); };
    window.addEventListener("circle-session-expired", onExpired);
    return () => window.removeEventListener("circle-session-expired", onExpired);
  }, []);

  const signedIn = (token, m) => { localStorage.setItem("circleToken", token); setMember(m); setExpired(false); setStatus("in"); };
  const logout = () => { localStorage.removeItem("circleToken"); setMember(null); setStatus("out"); };

  let page;
  if (join) page = <CircleJoin token={join.params.token} />;
  else if (status === "checking") page = <BrandLoader variant="screen" label={t.loading} />;
  else if (status === "out") page = <CircleLogin onSignedIn={signedIn} expired={expired} />;
  else if (member.mustChangePassword) page = <AuthLayout><PasswordForm forced /></AuthLayout>;
  else page = (
    <>
      <Topbar />
      <Routes>
        <Route index element={<CircleHome />} />
        <Route path="receipt/:id" element={<CircleReceipt />} />
        <Route path="certificate/:id" element={<CircleCertificate />} />
        <Route path="*" element={<CircleHome />} />
      </Routes>
      <footer className="tm-footer gm-noprint">
        <span>© {new Date().getFullYear()} {COMPANY}</span>
        <Link to="/">{t.visitSite} <ExternalIcon size={13} /></Link>
      </footer>
    </>
  );

  return (
    <CircleContext.Provider value={{ lang, setLang, t, msg, member, setMember, logout }}>
      <div className="tm gm" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}><BrandBackdrop />{page}<Toaster /></div>
    </CircleContext.Provider>
  );
}

function Brand({ subtitle }) {
  return (
    <Link to="/" className="tm-brand" title={COMPANY}>
      <BrandMark height={24} className="tm-logo" />
      <span className="tm-brand-text"><span className="tm-brand-name">{COMPANY}</span>{subtitle && <span className="tm-brand-sub">{subtitle}</span>}</span>
    </Link>
  );
}

function Switches() {
  const { t, lang, setLang } = useCircle();
  const { theme, toggleTheme } = useSite();
  return (
    <div className="tm-switches">
      <button type="button" className="tm-icon-pill" onClick={toggleTheme} aria-label={theme === "dark" ? t.themeLight : t.themeDark} title={theme === "dark" ? t.themeLight : t.themeDark}>
        {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
      </button>
      <button type="button" className="tm-icon-pill tm-lang-pill" onClick={() => setLang(lang === "ar" ? "en" : "ar")} lang={lang === "ar" ? "en" : "ar"}>
        <GlobeIcon size={16} /><span>{t.switchTo}</span>
      </button>
    </div>
  );
}

function Topbar() {
  const { t, lang, member, logout } = useCircle();
  const [menu, setMenu] = useState(false);
  const [changing, setChanging] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const onClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menu]);

  const reminder = (r) => r.kind === "payout"
    ? { text: t.remindPayout(r.amount, day(r.date, lang)), sub: r.circleName, tone: r.when === "today" ? "today" : "soon", to: "/gam3eya" }
    : { text: r.when === "late" ? t.remindLate(r.amount) : t.remindPay(r.amount, day(r.date, lang)), sub: r.circleName, tone: r.when === "late" ? "overdue" : r.when === "today" ? "today" : "soon", to: "/gam3eya" };
  const note = (n) => ({ text: (t.note_[n.kind] || ((a, d) => d))(n.actor, n.detail), to: "/gam3eya" });

  return (
    <>
      <header className="tm-topbar gm-noprint">
        <Brand subtitle={t.portal} />
        <div className="tm-topbar-actions">
          <CircleBell path="/circle/notifications" readPath="/circle/notifications/read" lang={lang} reminder={reminder} note={note}
            title={t.notifications} empty={t.noNotes} remindersTitle={t.remindersTitle} />
          <Switches />
          <div className="tm-account" ref={menuRef}>
            <button type="button" className="tm-account-btn" onClick={() => setMenu(!menu)} aria-expanded={menu}>
              <span className="tm-avatar">{initials(member.name)}</span>
              <span className="tm-account-name">{member.name.split(" ")[0]}</span>
            </button>
            {menu && (
              <div className="tm-menu" role="menu">
                <div className="tm-menu-head"><strong>{member.name}</strong><span dir="ltr">{member.phone}</span></div>
                <button type="button" role="menuitem" onClick={() => { setMenu(false); setChanging(true); }}><KeyIcon size={16} />{t.changePass}</button>
                <Link role="menuitem" to="/"><ExternalIcon size={16} />{t.visitSite}</Link>
                <button type="button" role="menuitem" className="is-danger" onClick={logout}><LogoutIcon size={16} />{t.logout}</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {changing && (
        <div className="tm-overlay" onClick={() => setChanging(false)}>
          <div className="tm-dialog" onClick={(e) => e.stopPropagation()}><PasswordForm onDone={() => setChanging(false)} onCancel={() => setChanging(false)} /></div>
        </div>
      )}
    </>
  );
}

function AuthLayout({ children }) {
  const { t } = useCircle();
  return (
    <div className="tm-authwrap">
      <aside className="tm-authside">
        <div className="tm-authside-top"><Brand /><Switches /></div>
        <div className="tm-authside-body">
          <span className="tm-eyebrow">{t.portal}</span>
          <h1>{t.tagline}</h1>
          <ul className="tm-perks">{t.perks.map((p) => <li key={p}><CheckCircleIcon size={18} />{p}</li>)}</ul>
        </div>
        <Link to="/" className="tm-authside-link">{t.visitSite} <ExternalIcon size={14} /></Link>
      </aside>
      <main className="tm-authmain">{children}</main>
    </div>
  );
}

const PENDING = "Your account is waiting for approval";

function CircleLogin({ onSignedIn, expired }) {
  const { t, msg } = useCircle();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { token, member } = await api.post("/circle/login", { phone, password });
      onSignedIn(token, member);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout>
      <form className="tm-auth-card" onSubmit={submit}>
        <h2>{t.signIn}</h2>
        <p className="tm-muted">{t.loginIntro}</p>
        {expired && !error && <p className="tm-note">{t.expired}</p>}
        {error && <p className={error === PENDING ? "tm-note" : "tm-error"} role="alert">{error === PENDING ? t.pendingNote : msg(error)}</p>}
        <label className="tm-field"><span>{t.phone}</span>
          <input className="fp-input" dir="ltr" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="01xxxxxxxxx" required />
        </label>
        <label className="tm-field"><span>{t.password}</span>
          <input className="fp-input" dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <button className="fp-btn tm-btn-block" type="submit" disabled={busy}>{busy ? t.signingIn : t.signIn}</button>
      </form>
    </AuthLayout>
  );
}

function CircleJoin({ token }) {
  const { t, msg } = useCircle();
  const [valid, setValid] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", password: "", confirm: "" });
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  useEffect(() => {
    api.get(`/circle/invites/${encodeURIComponent(token)}`).then((r) => setValid(r.valid)).catch((err) => { setValid(false); setError(err.message); });
  }, [token]);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError(t.mismatch);
    setBusy(true);
    try {
      const { member } = await api.post("/circle/signup", { token, name: form.name, phone: form.phone, password: form.password });
      setDone(member);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  let body;
  if (valid === null) body = <BrandLoader label={t.loading} />;
  else if (done) body = (<><h2>{t.joinedTitle}</h2><p className="tm-muted">{t.joinedText(done.name.split(" ")[0])}</p><Link className="fp-btn tm-btn-block" to="/gam3eya">{t.toLogin}</Link></>);
  else if (!valid) body = (<><h2>{t.join}</h2><p className="tm-error">{error ? msg(error) : t.badInvite}</p><Link className="fp-btn fp-btn-ghost tm-btn-block" to="/gam3eya">{t.toLogin}</Link></>);
  else body = (
    <form onSubmit={submit} className="tm-join-form">
      <h2>{t.join}</h2>
      <p className="tm-muted">{t.joinIntro}</p>
      {error && <p className="tm-error" role="alert">{msg(error)}</p>}
      <label className="tm-field"><span>{t.fullName}</span><input className="fp-input" dir="auto" value={form.name} onChange={set("name")} maxLength={80} autoComplete="name" required /></label>
      <label className="tm-field"><span>{t.phone}</span><input className="fp-input" dir="ltr" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="01xxxxxxxxx" autoComplete="tel" required /></label>
      <label className="tm-field"><span>{t.next}</span><input className="fp-input" dir="ltr" type="password" value={form.password} onChange={set("password")} minLength={8} autoComplete="new-password" required /></label>
      <label className="tm-field"><span>{t.confirm}</span><input className="fp-input" dir="ltr" type="password" value={form.confirm} onChange={set("confirm")} minLength={8} autoComplete="new-password" required /></label>
      <button className="fp-btn tm-btn-block" type="submit" disabled={busy}>{busy ? t.creating : t.create}</button>
      <p className="tm-muted tm-small">{t.haveAccount} <Link to="/gam3eya">{t.signIn}</Link></p>
    </form>
  );
  return <AuthLayout><div className="tm-auth-card">{body}</div></AuthLayout>;
}

function PasswordForm({ forced, onDone, onCancel }) {
  const { t, msg, setMember } = useCircle();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next !== form.confirm) return setError(t.mismatch);
    setBusy(true);
    try {
      const m = await api.post("/circle/password", { current: form.current, next: form.next });
      setMember(m);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="tm-auth-card" onSubmit={submit}>
      <h2>{forced ? t.newPassTitle : t.changePass}</h2>
      {forced && <p className="tm-muted">{t.newPassIntro}</p>}
      {error && <p className="tm-error" role="alert">{msg(error)}</p>}
      <label className="tm-field"><span>{t.current}</span><input className="fp-input" dir="ltr" type="password" value={form.current} onChange={set("current")} autoComplete="current-password" required /></label>
      <label className="tm-field"><span>{t.next}</span><input className="fp-input" dir="ltr" type="password" value={form.next} onChange={set("next")} minLength={8} autoComplete="new-password" required /></label>
      <label className="tm-field"><span>{t.confirm}</span><input className="fp-input" dir="ltr" type="password" value={form.confirm} onChange={set("confirm")} minLength={8} autoComplete="new-password" required /></label>
      <div className="tm-row">
        <button className="fp-btn" type="submit" disabled={busy}>{t.savePass}</button>
        {onCancel && <button className="fp-btn fp-btn-ghost" type="button" onClick={onCancel}>{t.cancel}</button>}
      </div>
    </form>
  );
}
