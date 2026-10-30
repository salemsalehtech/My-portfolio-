// TeamPortal.jsx — the member portal (/#/team/*), loaded on demand (React.lazy in App.jsx).
//
// A team member signs in with the username + password the owner created in Admin → Team. The
// token is kept in localStorage under "teamToken" (lib/api.js sends it on /team/* calls); it is
// a different login from the admin's. A new account must first replace its temporary password.
// Then:
//   /team               → TeamHome: my tasks + my projects
//   /team/projects/:id  → TeamProject: the project's board, docs and team
// The portal speaks English and Arabic (switch at the top, remembered in localStorage).
import { createContext, useContext, useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { api } from "../../lib/api";
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

  useEffect(() => { document.title = `${t.portal} | Salem Saleh`; }, [t.portal]);

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
  else if (member.mustChangePassword) page = <PasswordForm forced onDone={setMember} />;
  else page = (
    <Routes>
      <Route index element={<TeamHome />} />
      <Route path="projects/:id" element={<TeamProject />} />
      <Route path="*" element={<TeamHome />} />
    </Routes>
  );

  return (
    <TeamContext.Provider value={value}>
      <div className="tm" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>{page}</div>
    </TeamContext.Provider>
  );
}

// The small top bar shared by the portal's pages: brand, language switch, account actions.
export function TeamTopbar({ children }) {
  const { t, lang, setLang, member, logout } = useTeam();
  const [changing, setChanging] = useState(false);
  return (
    <>
      <header className="tm-topbar">
        <div className="tm-brand"><span className="nav-badge">SS</span><span>{t.portal}</span></div>
        <div className="tm-topbar-actions">
          {children}
          <button type="button" className="tm-link" onClick={() => setLang(lang === "ar" ? "en" : "ar")} lang={lang === "ar" ? "en" : "ar"}>{t.switchTo}</button>
          {member && <button type="button" className="tm-link" onClick={() => setChanging(true)}>{t.changePass}</button>}
          {member && <button type="button" className="tm-link" onClick={logout}>{t.logout}</button>}
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
    <>
      <TeamTopbar />
      <main className="tm-auth">
        <form className="tm-auth-card" onSubmit={submit}>
          <h1>{t.portal}</h1>
          <p className="tm-muted">{t.loginIntro}</p>
          {expired && !error && <p className="tm-note">{t.expired}</p>}
          {error && <p className="tm-error" role="alert">{error}</p>}
          <label className="tm-field"><span>{t.username}</span>
            <input className="fp-input" dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
          </label>
          <label className="tm-field"><span>{t.password}</span>
            <input className="fp-input" dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          <button className="fp-btn" type="submit" disabled={busy}>{busy ? t.signingIn : t.signIn}</button>
        </form>
      </main>
    </>
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

  const body = (
    <form className="tm-auth-card" onSubmit={submit}>
      <h1>{forced ? t.newPassTitle : t.changePass}</h1>
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
  return forced ? <><TeamTopbar /><main className="tm-auth">{body}</main></> : body;
}
