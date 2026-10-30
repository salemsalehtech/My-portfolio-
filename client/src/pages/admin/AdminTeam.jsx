// AdminTeam.jsx — the owner's team workspace (/admin/team), loaded on demand. Three tabs:
//   Overview — tasks waiting for review (approve / send back with a note), progress of every
//              project, each member's open / overdue / done-this-week tasks, recent activity.
//   Projects — the project list + "New project"; a project opens AdminTeamProject.jsx.
//   Members  — accounts: create (temporary password), edit, disable, reset password, delete,
//              and the portal link to send them (/#/team).
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { initials, portalLink, formatDue } from "../../lib/team";
import { useAdminT } from "../../lib/adminI18n";

const ACTIONS = {
  project_created: "created the project", task_created: "added a task", assigned: "assigned a task",
  started: "started", moved: "moved back to To do", submitted: "sent for review",
  approved: "approved", returned: "sent back",
};
const timeAgo = (iso, t) => {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return t("just now");
  if (min < 60) return t("{n} min ago", { n: min });
  if (min < 1440) return t("{n} h ago", { n: Math.round(min / 60) });
  return t("{n} d ago", { n: Math.round(min / 1440) });
};

export default function AdminTeam() {
  const { t } = useAdminT();
  const [tab, setTab] = useState("overview");
  return (
    <div>
      <h1>{t("Team")}</h1>
      <div className="admin-toolbar">
        {[["overview", "Overview"], ["projects", "Projects"], ["members", "Members"]].map(([key, label]) => (
          <button key={key} className={`admin-btn ${tab === key ? "admin-btn-primary" : ""}`} onClick={() => setTab(key)}>{t(label)}</button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "projects" && <Projects />}
      {tab === "members" && <Members />}
    </div>
  );
}

// ---- Overview ----
function Overview() {
  const { t, lang } = useAdminT();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/admin/team/overview").then(setData).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const approve = async (task) => { await api.post(`/admin/team/tasks/${task.id}/approve`); load(); };
  const sendBack = async (task) => {
    const note = window.prompt(t("What should {name} change in “{title}”?", { name: task.assignee?.name || t("the member"), title: task.title }));
    if (!note || !note.trim()) return;
    await api.post(`/admin/team/tasks/${task.id}/return`, { note });
    load();
  };

  if (!data) return <p className={error ? "admin-error" : ""}>{error || t("Loading…")}</p>;
  return (
    <div className="tm-admin">
      <section className="admin-linkbox">
        <h2 className="tm-admin-h">{t("Waiting for your review")} <span className="tm-count">{data.review.length}</span></h2>
        {data.review.length === 0 && <p className="admin-empty">{t("Nothing to review.")}</p>}
        {data.review.map((task) => (
          <div className="tm-review-row" key={task.id}>
            <div>
              <strong dir="auto">{task.title}</strong>
              <div className="tm-muted tm-small">{task.projectName} · {task.assignee?.name || "—"}{task.submittedAt ? ` · ${t("sent {when}", { when: timeAgo(task.submittedAt, t) })}` : ""}</div>
            </div>
            <div className="actions">
              <Link className="admin-btn" to={`/admin/team/projects/${task.project}?task=${task.id}`}>{t("Open")}</Link>
              <button className="admin-btn" onClick={() => sendBack(task)}>{t("Send back")}</button>
              <button className="admin-btn admin-btn-primary" onClick={() => approve(task)}>{t("Approve ✓")}</button>
            </div>
          </div>
        ))}
      </section>

      <div className="tm-admin-grid">
        <section className="admin-linkbox">
          <h2 className="tm-admin-h">{t("Projects")}</h2>
          {data.projects.length === 0 && <p className="admin-empty">{t("No active projects.")}</p>}
          {data.projects.map((p) => {
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <Link className="tm-admin-project" to={`/admin/team/projects/${p.id}`} key={p.id}>
                <span className="tm-admin-project-top"><strong dir="auto">{p.name}</strong><span className="tm-small tm-muted">{p.done}/{p.total} · {pct}%</span></span>
                <span className="tm-bar"><span style={{ width: `${pct}%` }} /></span>
                <span className="tm-small tm-muted">
                  {p.review > 0 && <span className="tm-pill">{t("{n} to review", { n: p.review })}</span>}
                  {p.overdue > 0 && <span className="tm-pill is-late">{t("{n} overdue", { n: p.overdue })}</span>}
                  {p.dueDate && <span>{t("Due")} {formatDue(p.dueDate, lang)}</span>}
                </span>
              </Link>
            );
          })}
        </section>

        <section className="admin-linkbox">
          <h2 className="tm-admin-h">{t("Members")}</h2>
          {data.members.length === 0 && <p className="admin-empty">{t("No members yet.")}</p>}
          <table className="admin-table tm-member-table">
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id} className={m.active ? "" : "tm-inactive"}>
                  <td><span className="tm-avatar">{initials(m.name)}</span> {m.name}<div className="tm-small tm-muted">{m.specialty}</div></td>
                  <td className="tm-num" title={t("Open tasks")}>{t("{n} open", { n: m.open })}</td>
                  <td className={`tm-num ${m.overdue ? "tm-late" : ""}`}>{t("{n} late", { n: m.overdue })}</td>
                  <td className="tm-num">{t("{n} done / 7d", { n: m.doneThisWeek })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-linkbox">
        <h2 className="tm-admin-h">{t("Recent activity")}</h2>
        {data.activity.length === 0 && <p className="admin-empty">{t("Nothing yet.")}</p>}
        <ul className="tm-activity">
          {data.activity.map((a) => (
            <li key={a.id}>
              <span><strong>{a.member ? a.member.name : t("You")}</strong> {t(ACTIONS[a.action] || a.action)} <span dir="auto">“{a.detail}”</span>{a.project ? <span className="tm-muted"> · {a.project.name}</span> : null}</span>
              <span className="tm-muted tm-small">{timeAgo(a.createdAt, t)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---- Projects ----
function Projects() {
  const { t, lang } = useAdminT();
  const [projects, setProjects] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api.get("/admin/team/projects").then(setProjects); }, []);

  const create = async () => {
    const name = window.prompt(t("Project name"));
    if (!name || !name.trim()) return;
    const project = await api.post("/admin/team/projects", { name: name.trim() });
    navigate(`/admin/team/projects/${project.id}?tab=settings`);
  };

  if (!projects) return <p>{t("Loading…")}</p>;
  return (
    <div>
      <div className="admin-toolbar"><button className="admin-btn admin-btn-primary" onClick={create}>{t("+ New project")}</button></div>
      <table className="admin-table">
        <thead><tr><th>{t("Project")}</th><th>{t("Status")}</th><th>{t("Progress")}</th><th>{t("Due")}</th><th>{t("Members")}</th></tr></thead>
        <tbody>
          {projects.length === 0 && <tr><td colSpan={5} className="admin-empty">{t("No projects yet.")}</td></tr>}
          {projects.map((p) => (
            <tr key={p.id}>
              <td><Link to={`/admin/team/projects/${p.id}`}><strong dir="auto">{p.name}</strong></Link></td>
              <td>{t(p.status)}</td>
              <td>{p.done}/{p.total}</td>
              <td>{p.dueDate ? formatDue(p.dueDate, lang) : "—"}</td>
              <td>{p.members.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Members ----
const EMPTY_MEMBER = { username: "", name: "", specialty: "", password: "" };
// A readable temporary password, e.g. "kite-4821-moon" (the member must change it on first login).
const WORDS = ["kite", "moon", "river", "cedar", "amber", "pixel", "orbit", "maple", "delta", "comet", "lotus", "ember"];
const tempPassword = () => {
  const pick = () => WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDS.length];
  return `${pick()}-${1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000)}-${pick()}`;
};

function Members() {
  const { t } = useAdminT();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(null); // null | the new-member form
  const [created, setCreated] = useState(null); // { username, password } to hand over once
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = () => api.get("/admin/team/members").then(setMembers);
  useEffect(() => { load(); }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const m = await api.post("/admin/team/members", form);
      setCreated({ name: m.name, username: m.username, password: form.password });
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const edit = async (m) => {
    const name = window.prompt(t("Name"), m.name);
    if (name === null) return;
    const specialty = window.prompt(t("Specialty (e.g. Frontend, Backend, UI design)"), m.specialty);
    if (specialty === null) return;
    await api.put(`/admin/team/members/${m.id}`, { name, specialty });
    load();
  };
  const toggle = async (m) => { await api.put(`/admin/team/members/${m.id}`, { active: !m.active }); load(); };
  const reset = async (m) => {
    if (!confirm(`Give ${m.name} a new temporary password?`)) return;
    const password = tempPassword();
    await api.post(`/admin/team/members/${m.id}/password`, { password });
    setCreated({ name: m.name, username: m.username, password });
    load();
  };
  const remove = async (m) => {
    if (!confirm(t("Delete {name}? Their tasks stay, without an assignee.", { name: m.name }))) return;
    await api.del(`/admin/team/members/${m.id}`);
    load();
  };
  const copyLogin = async () => {
    const text = `${t("Team workspace")}: ${portalLink()}\n${t("Username")}: ${created.username}\n${t("Temporary password")}: ${created.password}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt(t("Copy:"), text); }
  };

  return (
    <div>
      <div className="admin-linkbox">
        <p>{t("Members sign in at the team portal with their username. Send them this link:")}</p>
        <div className="admin-linkrow">
          <input className="form-input" readOnly value={portalLink()} onFocus={(e) => e.target.select()} />
          <a className="admin-btn" href={portalLink()} target="_blank" rel="noreferrer">{t("Open")}</a>
        </div>
      </div>

      {created && (
        <div className="admin-notice">
          <strong>{t("Login for {name}", { name: created.name })}</strong> — {t("Username")} <code>{created.username}</code>, {t("Temporary password")} <code>{created.password}</code>.{" "}
          {t("It is shown only now; {name} must choose a new password on first login.", { name: created.name.split(" ")[0] })}{" "}
          <button className="admin-btn" onClick={copyLogin}>{copied ? t("Copied ✓") : t("Copy login details")}</button>{" "}
          <button className="admin-btn" onClick={() => setCreated(null)}>{t("Done")}</button>
        </div>
      )}

      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={() => { setError(""); setForm({ ...EMPTY_MEMBER, password: tempPassword() }); }}>{t("+ New member")}</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>{t("Member")}</th><th>{t("Username")}</th><th>{t("Specialty")}</th><th>{t("Status")}</th><th></th></tr></thead>
        <tbody>
          {members.length === 0 && <tr><td colSpan={5} className="admin-empty">{t("No members yet.")}</td></tr>}
          {members.map((m) => (
            <tr key={m.id} className={m.active ? "" : "tm-inactive"}>
              <td><span className="tm-avatar">{initials(m.name)}</span> {m.name}</td>
              <td><code>{m.username}</code></td>
              <td>{m.specialty || "—"}</td>
              <td>{!m.active ? t("Disabled") : m.mustChangePassword ? t("Waiting for first login") : m.lastLoginAt ? t("Active · last login {date}", { date: new Date(m.lastLoginAt).toLocaleDateString("en-GB") }) : t("Active")}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => edit(m)}>{t("Edit")}</button>
                <button className="admin-btn" onClick={() => reset(m)}>{t("Reset password")}</button>
                <button className="admin-btn" onClick={() => toggle(m)}>{m.active ? t("Disable") : t("Enable")}</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(m)}>{t("Delete")}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <div className="admin-modal-overlay" onClick={() => setForm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("New member")}</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>{t("Full name")}<input className="form-input" value={form.name} onChange={set("name")} maxLength={80} required /></label>
                <label>{t("Specialty")}<input className="form-input" value={form.specialty} onChange={set("specialty")} maxLength={80} placeholder={t("e.g. Frontend")} /></label>
              </div>
              <div className="admin-form-row">
                <label>{t("Username")}<input className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} maxLength={30} placeholder="mona.adel" required /></label>
                <label>{t("Temporary password")}<input className="form-input" value={form.password} onChange={set("password")} minLength={8} required /></label>
              </div>
              <p style={{ opacity: 0.7, fontSize: 13, margin: 0 }}>{t("Username: 3–30 characters (a-z, 0-9, . _ -). The member changes the temporary password on first login.")}</p>
              {error && <p className="admin-error">{error}</p>}
              <div className="admin-form-actions">
                <button type="button" className="admin-btn" onClick={() => setForm(null)}>{t("Cancel")}</button>
                <button type="submit" className="admin-btn admin-btn-primary">{t("Create member")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
