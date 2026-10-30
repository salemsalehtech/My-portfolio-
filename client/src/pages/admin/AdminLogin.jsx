// AdminLogin.jsx — the /admin/login page: an email/password form. On submit it calls
// login() from AdminContext (which hits POST /auth/login on the server and stores the
// returned JWT), then goes back to the admin page that sent it here (or /admin/projects).
// Shown instead of the admin dashboard whenever AdminLayout finds the user isn't authenticated
// — including when the 7-day login ran out, which it then explains.
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useAdminT } from "../../lib/adminI18n";

export default function AdminLogin() {
  const { login, expired } = useAdmin();
  const { t, dir, lang } = useAdminT();
  const navigate = useNavigate();
  const from = useLocation().state?.from;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(from && from.startsWith("/admin/") && from !== "/admin/login" ? from : "/admin/projects", { replace: true });
    } catch (err) {
      setError(err.message || t("Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page admin-login" dir={dir} lang={lang}>
      <div className="admin-login-card">
        <h1>{t("Admin Login")}</h1>
        {expired && !error && <div className="admin-notice">{t("Your login has expired (logins last 7 days). Please sign in again.")}</div>}
        {error && <div className="admin-error">{error}</div>}
        <form className="admin-form" onSubmit={submit}>
          <label>
            {t("Email")}
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            {t("Password")}
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? t("Signing in…") : t("Sign In")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
