// TeamJoin.jsx — sign up with an invite link (/#/team/join/<token>). The owner makes the link in
// Admin → Team → Members; the new member fills in name, specialty, username and password, and the
// account then waits for the owner's approval (routes/team.js → POST /signup).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useTeam, AuthLayout } from "./TeamPortal";

export default function TeamJoin({ token }) {
  const { t, msg } = useTeam();
  const [valid, setValid] = useState(null); // null = checking
  const [form, setForm] = useState({ name: "", specialty: "", username: "", password: "", confirm: "" });
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: key === "username" ? e.target.value.toLowerCase().trim() : e.target.value });

  useEffect(() => {
    api.get(`/team/invites/${encodeURIComponent(token)}`).then((r) => setValid(r.valid)).catch((err) => { setValid(false); setError(err.message); });
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError(t.mismatch);
    setBusy(true);
    try {
      const { member } = await api.post("/team/signup", { token, name: form.name, specialty: form.specialty, username: form.username, password: form.password });
      setDone(member);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (valid === null) body = <p className="tm-muted">{t.loading}</p>;
  else if (done) body = (
    <>
      <h2>{t.joinedTitle}</h2>
      <p className="tm-muted">{t.joinedText(done.name.split(" ")[0])}</p>
      <p className="tm-note">{t.username}: <code dir="ltr">{done.username}</code></p>
      <Link className="fp-btn tm-btn-block" to="/team">{t.toLogin}</Link>
    </>
  );
  else if (!valid) body = (
    <>
      <h2>{t.join}</h2>
      <p className="tm-error" role="alert">{error ? msg(error) : t.badInvite}</p>
      <Link className="fp-btn fp-btn-ghost tm-btn-block" to="/team">{t.toLogin}</Link>
    </>
  );
  else body = (
    <form onSubmit={submit} className="tm-join-form">
      <h2>{t.join}</h2>
      <p className="tm-muted">{t.joinIntro}</p>
      {error && <p className="tm-error" role="alert">{msg(error)}</p>}
      <label className="tm-field"><span>{t.fullName}</span>
        <input className="fp-input" dir="auto" value={form.name} onChange={set("name")} maxLength={80} autoComplete="name" required />
      </label>
      <label className="tm-field"><span>{t.specialty}</span>
        <input className="fp-input" dir="auto" value={form.specialty} onChange={set("specialty")} maxLength={80} placeholder="Frontend, UI design…" />
      </label>
      <label className="tm-field"><span>{t.username}</span>
        <input className="fp-input" dir="ltr" value={form.username} onChange={set("username")} maxLength={30} pattern="[a-z0-9._\-]{3,30}" autoComplete="username" autoCapitalize="none" required />
        <small className="tm-muted">{t.usernameHint}</small>
      </label>
      <label className="tm-field"><span>{t.next}</span>
        <input className="fp-input" dir="ltr" type="password" value={form.password} onChange={set("password")} minLength={8} maxLength={100} autoComplete="new-password" required />
      </label>
      <label className="tm-field"><span>{t.confirm}</span>
        <input className="fp-input" dir="ltr" type="password" value={form.confirm} onChange={set("confirm")} minLength={8} maxLength={100} autoComplete="new-password" required />
      </label>
      <button className="fp-btn tm-btn-block" type="submit" disabled={busy}>{busy ? t.creating : t.create}</button>
      <p className="tm-muted tm-small">{t.haveAccount} <Link to="/team">{t.signIn}</Link></p>
    </form>
  );

  return <AuthLayout><div className="tm-auth-card">{body}</div></AuthLayout>;
}
