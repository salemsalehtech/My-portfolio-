// TeamPortal.jsx — the member portal (/#/team/*), loaded on demand (React.lazy in App.jsx),
// branded as the company (lib/brand.js). The logo / company name always leads back to the website.
//
// A team member signs in with the username + password the owner created in Admin → Team. The
// token is kept in localStorage under "teamToken" (lib/api.js sends it on /team/* calls); it is
// a different login from the admin's. A new account must first replace its temporary password.
// Then:
//   /team               → TeamOverview: numbers, what needs attention, standup, cheers (Home tab)
//   /team/tasks         → TeamTasks: all my tasks by status
//   /team/projects      → TeamProjects: my projects
//   /team/projects/:id  → TeamProject: the project's board, docs and team (?task=<id> opens a task)
//   /team/news          → TeamNews: announcements from the owner (files, voice notes, "Got it")
//   /team/me            → TeamMe: my profile, badges, thank-you notes, availability, notifications
// The tabs (TeamNav.jsx) share one load of my work (WorkContext.jsx). While anything loads, the
// brand loader shows (components/BrandLoader.jsx); the SS mark sits behind the page (BrandBackdrop.jsx).
//   /team/join/:token   → TeamJoin: sign up with an invite link (works without logging in)
// The top bar has the notification bell 🔔 (components/team/Bell.jsx).
// The portal speaks English and Arabic (remembered in localStorage) and follows the site's
// light / dark theme; both switches are in the top bar.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useMatch } from "react-router-dom";
import { loadRules } from "../../lib/rules";
import { api } from "../../lib/api";
import { COMPANY } from "../../lib/brand";
import { initials } from "../../lib/team";
import { KeyIcon, LogoutIcon, ExternalIcon } from "../../components/team/icons";
import { TEAM_COPY, SERVER_AR } from "./teamCopy";
import TeamOverview from "./TeamOverview";
import TeamTasks from "./TeamTasks";
import TeamProjects from "./TeamProjects";
import TeamNews from "./TeamNews";
import TeamMe from "./TeamMe";
import TeamNav from "./TeamNav";
import { WorkProvider } from "./WorkContext";
import BrandLoader from "../../components/BrandLoader";
import BrandBackdrop from "../../components/BrandBackdrop";
import TeamProject from "./TeamProject";
import TeamJoin from "./TeamJoin";
import Toaster from "../../components/Toaster";
import Bell from "../../components/team/Bell";
import { PortalBrand, PortalSwitches, AuthLayout as SharedAuthLayout, PasswordForm as SharedPasswordForm } from "../../components/PortalShell";

const TeamContext = createContext(null);
export const useTeam = () => useContext(TeamContext);

const readLang = () => { try { return localStorage.getItem("teamLang") === "en" ? "en" : "ar"; } catch { return "ar"; } };

export default function TeamPortal() {
  const [lang, setLangState] = useState(readLang);
  const [member, setMember] = useState(null);
  const [status, setStatus] = useState(() => (localStorage.getItem("teamToken") ? "checking" : "out")); // checking | out | in
  const [expired, setExpired] = useState(false);
  const t = TEAM_COPY[lang];
  const join = useMatch("/team/join/:token");
  // A server message in the portal's language (English messages pass through).
  const msg = (text) => (lang === "ar" ? SERVER_AR[text] || text : text);

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
  useEffect(() => { loadRules(); }, []); // upload limits, moves, time zone (lib/rules.js)

  const signedIn = (token, m) => {
    localStorage.setItem("teamToken", token);
    setMember(m);
    setExpired(false);
    setStatus("in");
  };
  const logout = () => { localStorage.removeItem("teamToken"); setMember(null); setStatus("out"); };

  const value = { lang, setLang, t, msg, member, setMember, logout };
  let page;
  if (join) page = <TeamJoin token={join.params.token} />;
  else if (status === "checking") page = <BrandLoader variant="screen" label={t.loading} />;
  else if (status === "out") page = <TeamLogin onSignedIn={signedIn} expired={expired} />;
  else if (member.mustChangePassword) page = <AuthLayout><PasswordForm forced /></AuthLayout>;
  else page = (
    <WorkProvider>
      <TeamTopbar />
      <TeamNav />
      <Routes>
        <Route index element={<TeamOverview />} />
        <Route path="tasks" element={<TeamTasks />} />
        <Route path="projects" element={<TeamProjects />} />
        <Route path="projects/:id" element={<TeamProject />} />
        <Route path="news" element={<TeamNews />} />
        <Route path="me" element={<TeamMe />} />
        <Route path="*" element={<TeamOverview />} />
      </Routes>
      <TeamFooter />
    </WorkProvider>
  );

  return (
    <TeamContext.Provider value={value}>
      <div className="tm" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}><BrandBackdrop />{page}<Toaster /></div>
    </TeamContext.Provider>
  );
}



function TeamTopbar() {
  const { t, lang, member, logout } = useTeam();
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
          <Bell base="/team" lang={lang} link={({ project, task, kind }) => (kind === "announcement" ? "/team/news" : project && task ? `/team/projects/${project}?task=${task}` : null)} />
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


function TeamLogin({ onSignedIn, expired }) {
  const { t, msg } = useTeam();
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
        {error && <p className={error === "Your account is waiting for approval" ? "tm-note" : "tm-error"} role="alert">{error === "Your account is waiting for approval" ? t.pendingNote : msg(error)}</p>}
        <label className="tm-field"><span>{t.username}</span>
          <input className="fp-input" dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </label>
        <label className="tm-field"><span>{t.password}</span>
          <input className="fp-input" dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <button className="fp-btn tm-btn-block" type="submit" disabled={busy}>{busy ? t.signingIn : t.signIn}</button>
        {busy && <BrandLoader variant="screen" label={t.signingIn} />}
      </form>
    </AuthLayout>
  );
}

// The shared portal pieces (components/PortalShell.jsx) with the team's texts and API.
const Brand = PortalBrand;
function Switches() {
  const { t, lang, setLang } = useTeam();
  return <PortalSwitches t={t} lang={lang} setLang={setLang} />;
}
export function AuthLayout({ children }) {
  const { t, lang, setLang } = useTeam();
  return <SharedAuthLayout t={t} lang={lang} setLang={setLang}>{children}</SharedAuthLayout>;
}
function PasswordForm(props) {
  const { t, msg, setMember } = useTeam();
  return <SharedPasswordForm {...props} t={t} msg={msg} post={(body) => api.post("/team/password", body)} onSaved={setMember} />;
}
