// AdminLogin.jsx — the /admin/login page: an email/password form. On submit it calls
// login() from AdminContext (which hits POST /auth/login on the server and stores the
// returned JWT), then goes back to the admin page that sent it here (or /admin/projects).
// Shown instead of the admin dashboard whenever AdminLayout finds the user isn't authenticated
// — including when the 7-day login ran out, which it then explains.
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";

export default function AdminLogin() {
  const { login, expired } = useAdmin();
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
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page admin-login">
      <div className="admin-login-card">
        <h1>Admin Login</h1>
        {expired && !error && <div className="admin-notice">Your login has expired (logins last 7 days). Please sign in again.</div>}
        {error && <div className="admin-error">{error}</div>}
        <form className="admin-form" onSubmit={submit}>
          <label>
            Email
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <div className="admin-form-actions">
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
