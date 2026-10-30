// TeamPortal.jsx — the member portal (/#/team/*), loaded on demand (React.lazy in App.jsx),
// branded as the company (lib/brand.js). The logo / company name always leads back to the website.
//
// A team member signs in with the username + password the owner created in Admin → Team. The
// token is kept in localStorage under "teamToken" (lib/api.js sends it on /team/* calls); it is
// a different login from the admin's. A new account must first replace its temporary password.
// Then:
//   /team               → TeamHome: what needs attention, my tasks, my projects
//   /team/projects/:id  → TeamProject: the project's board, docs and team
// The portal speaks English and Arabic (remembered in localStorage) and follows the site's
// light / dark theme; both switches are in the top bar.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { api } from "../../lib/api";
import { COMPANY } from "../../lib/brand";
import { initials } from "../../lib/team";
import { useSite } from "../../context/SiteContext";
import { SunIcon, MoonIcon, GlobeIcon, KeyIcon, LogoutIcon, ExternalIcon, CheckCircleIcon } from "../../components/team/icons";
import { TEAM_COPY } from "./teamCopy";
import TeamHome from "./TeamHome";
import TeamProject from "./TeamProject";

const TeamContext = createContext(null);
export const useTeam = () => useContext(TeamContext);

const readLang = () => { try { return localStorage.getItem("teamLang") === "en" ? "en" : "ar"; } catch { return "ar"; } };

export default function TeamPortal() {
  const [lang, setLangState] = useState(readLang);
  const [member, setMember] = useState(null);
  const [status, setStatus] = useState(() => (localStorage.getItem("teamToken") ? "checking" : "out")); // checking | out | in
  const [expired, setExpired] = useState(false);
  const t = TEAM_COPY[lang];

  const setLang = (next) => { setLangState(next); try { localStorage.setItem("teamLang", next); } catch { /* private mode */ } };

  // Check the saved token once (it may have expired or the account may be disabled).
  useEffect(() => {
    if (status !== "checking") return;
    api.get("/team/me").then((m) => { setMember(m); setStatus("in"); }).catch(() => setStatus("out"));
  }, [status]);

  // lib/api.js fires this when the server rejects the token (expired / account disabled).
  useEffect(() => {
    const onExpired = () => { setMember(null); setStatus("out"); setExpired(true); };
    window.addEventListener("team-session-expired", onExpired);
    return () => window.removeEventListener("team-session-expired", onExpired);
  }, []);

  useEffect(() => { document.title = `${t.portal} · ${COMPANY}`; }, [t.portal]);

  const signedIn = (token, m) => {
    localStorage.setItem("teamToken", token);
    setMember(m);
    setExpired(false);
    setStatus("in");
  };
  const logout = () => { localStorage.removeItem("teamToken"); setMember(null); setStatus("out"); };

  const value = { lang, setLang, t, member, setMember, logout };
  let page;
  if (status === "checking") page = <p className="tm-loading">{t.loading}</p>;
  else if (status === "out") page = <TeamLogin onSignedIn={signedIn} expired={expired} />;
  else if (member.mustChangePassword) page = <AuthLayout><PasswordForm forced /></AuthLayout>;
  else page = (
    <>
      <TeamTopbar />
      <Routes>
        <Route index element={<TeamHome />} />
        <Route path="projects/:id" element={<TeamProject />} />
        <Route path="*" element={<TeamHome />} />
      </Routes>
      <TeamFooter />
    </>
  );

  return (
    <TeamContext.Provider value={value}>
      <div className="tm" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>{page}</div>
    </TeamContext.Provider>
  );
}

// The company mark + name, linking back to the website.
function Brand({ subtitle }) {
  return (
    <Link to="/" className="tm-brand" title={COMPANY}>
      <span className="tm-logo">SS</span>
      <span className="tm-brand-text">
        <span className="tm-brand-name">{COMPANY}</span>
        {subtitle && <span className="tm-brand-sub">{subtitle}</span>}
      </span>
    </Link>
  );
}

// Theme + language switches (used in the top bar and on the login screen).
function Switches() {
  const { t, lang, setLang } = useTeam();
  const { theme, toggleTheme } = useSite();
  return (
    <div className="tm-switches">
      <button type="button" className="tm-icon-pill" onClick={toggleTheme} title={theme === "dark" ? t.themeLight : t.themeDark} aria-label={theme === "dark" ? t.themeLight : t.themeDark}>
        {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
      </button>
      <button type="button" className="tm-icon-pill tm-lang-pill" onClick={() => setLang(lang === "ar" ? "en" : "ar")} lang={lang === "ar" ? "en" : "ar"}>
        <GlobeIcon size={16} /><span>{t.switchTo}</span>
      </button>
    </div>
  );
}

function TeamTopbar() {
  const { t, member, logout } = useTeam();
  const [menu, setMenu] = useState(false);
  const [changing, setChanging] = useState(false);
  const menuRef = useRef(null);

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const onClick = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [menu]);

  return (
    <>
      <header className="tm-topbar">
        <Brand subtitle={t.portal} />
        <div className="tm-topbar-actions">
          <Switches />
          <div className="tm-account" ref={menuRef}>
            <button type="button" className="tm-account-btn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={t.account}>
              <span className="tm-avatar">{initials(member.name)}</span>
              <span className="tm-account-name">{member.name.split(" ")[0]}</span>
            </button>
            {menu && (
              <div className="tm-menu" role="menu">
                <div className="tm-menu-head"><strong>{member.name}</strong><span>{member.specialty || `@${member.username}`}</span></div>
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
          <div className="tm-dialog" onClick={(e) => e.stopPropagation()}>
            <PasswordForm onDone={() => setChanging(false)} onCancel={() => setChanging(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function TeamFooter() {
  const { t } = useTeam();
  return (
    <footer className="tm-footer">
      <span>© {new Date().getFullYear()} {COMPANY}</span>
      <Link to="/">{t.visitSite} <ExternalIcon size={13} /></Link>
    </footer>
  );
}

// Login / first password: a brand panel beside the form (stacked on phones).
function AuthLayout({ children }) {
  const { t } = useTeam();
  return (
    <div className="tm-authwrap">
      <aside className="tm-authside">
        <div className="tm-authside-top"><Brand /><Switches /></div>
        <div className="tm-authside-body">
          <span className="tm-eyebrow">{t.portal}</span>
          <h1>{t.tagline}</h1>
          <ul className="tm-perks">
            {t.perks.map((p) => <li key={p}><CheckCircleIcon size={18} />{p}</li>)}
          </ul>
        </div>
        <Link to="/" className="tm-authside-link">{t.visitSite} <ExternalIcon size={14} /></Link>
      </aside>
      <main className="tm-authmain">{children}</main>
    </div>
  );
}

function TeamLogin({ onSignedIn, expired }) {
  const { t } = useTeam();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { token, member } = await api.post("/team/login", { username, password });
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
        {error && <p className="tm-error" role="alert">{error}</p>}
        <label className="tm-field"><span>{t.username}</span>
          <input className="fp-input" dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </label>
        <label className="tm-field"><span>{t.password}</span>
          <input className="fp-input" dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <button className="fp-btn tm-btn-block" type="submit" disabled={busy}>{busy ? t.signingIn : t.signIn}</button>
      </form>
    </AuthLayout>
  );
}

// Changes the member's password. `forced`: the first-login screen (no way around it).
function PasswordForm({ forced, onDone, onCancel }) {
  const { t, setMember } = useTeam();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next !== form.confirm) return setError(t.mismatch);
    setBusy(true);
    try {
      const member = await api.post("/team/password", { current: form.current, next: form.next });
      setMember(member);
      onDone?.(member);
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
      {error && <p className="tm-error" role="alert">{error}</p>}
      <label className="tm-field"><span>{t.current}</span>
        <input className="fp-input" dir="ltr" type="password" value={form.current} onChange={set("current")} autoComplete="current-password" required />
      </label>
      <label className="tm-field"><span>{t.next}</span>
        <input className="fp-input" dir="ltr" type="password" value={form.next} onChange={set("next")} autoComplete="new-password" minLength={8} required />
      </label>
      <label className="tm-field"><span>{t.confirm}</span>
        <input className="fp-input" dir="ltr" type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" minLength={8} required />
      </label>
      <div className="tm-row">
        <button className="fp-btn" type="submit" disabled={busy}>{t.savePass}</button>
        {onCancel && <button className="fp-btn fp-btn-ghost" type="button" onClick={onCancel}>{t.cancel}</button>}
      </div>
    </form>
  );
}
