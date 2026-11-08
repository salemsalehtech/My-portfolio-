// PortalShell.jsx — the pieces the team portal (/#/team) and the savings-circles portal
// (/#/gam3eya) share, so the brand, the switches, the sign-in layout and the password form look
// and behave the same in both and change in one place:
//   PortalBrand     the SS mark + company name, linking back to the website
//   PortalSwitches  light / dark theme + English / Arabic
//   AuthLayout      sign-in screens: a brand panel beside the form (stacked on phones)
//   PasswordForm    change the password (also the forced first-login screen)
// Each portal passes its own texts (`t`), language switch and API address.
import { useState } from "react";
import { Link } from "react-router-dom";
import { COMPANY } from "../lib/brand";
import { useSite } from "../context/SiteContext";
import BrandMark from "./BrandMark";
import { SunIcon, MoonIcon, GlobeIcon, ExternalIcon, CheckCircleIcon } from "./team/icons";

export function PortalBrand({ subtitle }) {
  return (
    <Link to="/" className="tm-brand" title={COMPANY}>
      <BrandMark height={24} className="tm-logo" />
      <span className="tm-brand-text">
        <span className="tm-brand-name">{COMPANY}</span>
        {subtitle && <span className="tm-brand-sub">{subtitle}</span>}
      </span>
    </Link>
  );
}

export function PortalSwitches({ t, lang, setLang }) {
  const { theme, toggleTheme } = useSite();
  const themeLabel = theme === "dark" ? t.themeLight : t.themeDark;
  return (
    <div className="tm-switches">
      <button type="button" className="tm-icon-pill" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>
        {theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
      </button>
      <button type="button" className="tm-icon-pill tm-lang-pill" onClick={() => setLang(lang === "ar" ? "en" : "ar")} lang={lang === "ar" ? "en" : "ar"}>
        <GlobeIcon size={16} /><span>{t.switchTo}</span>
      </button>
    </div>
  );
}

export function AuthLayout({ t, lang, setLang, children }) {
  return (
    <div className="tm-authwrap">
      <aside className="tm-authside">
        <div className="tm-authside-top"><PortalBrand /><PortalSwitches t={t} lang={lang} setLang={setLang} /></div>
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

// `post(body)` sends { current, next } to the portal's password route and resolves with the
// updated member; `onSaved(member)` stores it. `forced` = the first-login screen (no Cancel).
export function PasswordForm({ t, msg, post, onSaved, forced, onDone, onCancel }) {
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
      const member = await post({ current: form.current, next: form.next });
      onSaved(member);
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
      {error && <p className="tm-error" role="alert">{msg(error)}</p>}
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
