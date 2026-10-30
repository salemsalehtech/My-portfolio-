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

const ACTIONS = {
  project_created: "created the project", task_created: "added a task", assigned: "assigned a task",
  started: "started", moved: "moved back to To do", submitted: "sent for review",
  approved: "approved", returned: "sent back",
};
const timeAgo = (iso) => {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.round(min / 60)} h ago`;
  return `${Math.round(min / 1440)} d ago`;
};

export default function AdminTeam() {
  const [tab, setTab] = useState("overview");
  return (
    <div>
      <h1>Team</h1>
      <div className="admin-toolbar">
        {[["overview", "Overview"], ["projects", "Projects"], ["members", "Members"]].map(([key, label]) => (
          <button key={key} className={`admin-btn ${tab === key ? "admin-btn-primary" : ""}`} onClick={() => setTab(key)}>{label}</button>
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
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/admin/team/overview").then(setData).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const approve = async (task) => { await api.post(`/admin/team/tasks/${task.id}/approve`); load(); };
  const sendBack = async (task) => {
    const note = window.prompt(`What should ${task.assignee?.name || "the member"} change in "${task.title}"?`);
    if (!note || !note.trim()) return;
    await api.post(`/admin/team/tasks/${task.id}/return`, { note });
    load();
  };

  if (!data) return <p className={error ? "admin-error" : ""}>{error || "Loading…"}</p>;
  return (
    <div className="tm-admin">
      <section className="admin-linkbox">
        <h2 className="tm-admin-h">Waiting for your review <span className="tm-count">{data.review.length}</span></h2>
        {data.review.length === 0 && <p className="admin-empty">Nothing to review.</p>}
        {data.review.map((task) => (
          <div className="tm-review-row" key={task.id}>
            <div>
              <strong dir="auto">{task.title}</strong>
              <div className="tm-muted tm-small">{task.projectName} · {task.assignee?.name || "—"}{task.submittedAt ? ` · sent ${timeAgo(task.submittedAt)}` : ""}</div>
            </div>
            <div className="actions">
              <Link className="admin-btn" to={`/admin/team/projects/${task.project}?task=${task.id}`}>Open</Link>
              <button className="admin-btn" onClick={() => sendBack(task)}>Send back</button>
              <button className="admin-btn admin-btn-primary" onClick={() => approve(task)}>Approve ✓</button>
            </div>
          </div>
        ))}
      </section>

      <div className="tm-admin-grid">
        <section className="admin-linkbox">
          <h2 className="tm-admin-h">Projects</h2>
          {data.projects.length === 0 && <p className="admin-empty">No active projects.</p>}
          {data.projects.map((p) => {
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <Link className="tm-admin-project" to={`/admin/team/projects/${p.id}`} key={p.id}>
                <span className="tm-admin-project-top"><strong dir="auto">{p.name}</strong><span className="tm-small tm-muted">{p.done}/{p.total} · {pct}%</span></span>
                <span className="tm-bar"><span style={{ width: `${pct}%` }} /></span>
                <span className="tm-small tm-muted">
                  {p.review > 0 && <span className="tm-pill">{p.review} to review</span>}
                  {p.overdue > 0 && <span className="tm-pill is-late">{p.overdue} overdue</span>}
                  {p.dueDate && <span>Due {formatDue(p.dueDate)}</span>}
                </span>
              </Link>
            );
          })}
        </section>

        <section className="admin-linkbox">
          <h2 className="tm-admin-h">Members</h2>
          {data.members.length === 0 && <p className="admin-empty">No members yet.</p>}
          <table className="admin-table tm-member-table">
            <tbody>
              {data.members.map((m) => (
                <tr key={m.id} className={m.active ? "" : "tm-inactive"}>
                  <td><span className="tm-avatar">{initials(m.name)}</span> {m.name}<div className="tm-small tm-muted">{m.specialty}</div></td>
                  <td className="tm-num" title="Open tasks">{m.open} open</td>
                  <td className={`tm-num ${m.overdue ? "tm-late" : ""}`}>{m.overdue} late</td>
                  <td className="tm-num">{m.doneThisWeek} done / 7d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-linkbox">
        <h2 className="tm-admin-h">Recent activity</h2>
        {data.activity.length === 0 && <p className="admin-empty">Nothing yet.</p>}
        <ul className="tm-activity">
          {data.activity.map((a) => (
            <li key={a.id}>
              <span><strong>{a.member ? a.member.name : "You"}</strong> {ACTIONS[a.action] || a.action} <span dir="auto">“{a.detail}”</span>{a.project ? <span className="tm-muted"> · {a.project.name}</span> : null}</span>
              <span className="tm-muted tm-small">{timeAgo(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---- Projects ----
function Projects() {
  const [projects, setProjects] = useState(null);
  const navigate = useNavigate();
  useEffect(() => { api.get("/admin/team/projects").then(setProjects); }, []);

  const create = async () => {
    const name = window.prompt("Project name");
    if (!name || !name.trim()) return;
    const project = await api.post("/admin/team/projects", { name: name.trim() });
    navigate(`/admin/team/projects/${project.id}?tab=settings`);
  };

  if (!projects) return <p>Loading…</p>;
  return (
    <div>
      <div className="admin-toolbar"><button className="admin-btn admin-btn-primary" onClick={create}>+ New project</button></div>
      <table className="admin-table">
        <thead><tr><th>Project</th><th>Status</th><th>Progress</th><th>Due</th><th>Members</th></tr></thead>
        <tbody>
          {projects.length === 0 && <tr><td colSpan={5} className="admin-empty">No projects yet.</td></tr>}
          {projects.map((p) => (
            <tr key={p.id}>
              <td><Link to={`/admin/team/projects/${p.id}`}><strong dir="auto">{p.name}</strong></Link></td>
              <td>{p.status}</td>
              <td>{p.done}/{p.total}</td>
              <td>{p.dueDate ? formatDue(p.dueDate) : "—"}</td>
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
    const name = window.prompt("Name", m.name);
    if (name === null) return;
    const specialty = window.prompt("Specialty (e.g. Frontend, Backend, UI design)", m.specialty);
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
    if (!confirm(`Delete ${m.name}? Their tasks stay, without an assignee.`)) return;
    await api.del(`/admin/team/members/${m.id}`);
    load();
  };
  const copyLogin = async () => {
    const text = `Team workspace: ${portalLink()}\nUsername: ${created.username}\nTemporary password: ${created.password}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt("Copy:", text); }
  };

  return (
    <div>
      <div className="admin-linkbox">
        <p>Members sign in at the team portal with their username. Send them this link:</p>
        <div className="admin-linkrow">
          <input className="form-input" readOnly value={portalLink()} onFocus={(e) => e.target.select()} />
          <a className="admin-btn" href={portalLink()} target="_blank" rel="noreferrer">Open</a>
        </div>
      </div>

      {created && (
        <div className="admin-notice">
          <strong>Login for {created.name}</strong> — username <code>{created.username}</code>, temporary password <code>{created.password}</code>.
          It is shown only now; {created.name.split(" ")[0]} must choose a new password on first login.{" "}
          <button className="admin-btn" onClick={copyLogin}>{copied ? "Copied ✓" : "Copy login details"}</button>{" "}
          <button className="admin-btn" onClick={() => setCreated(null)}>Done</button>
        </div>
      )}

      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-primary" onClick={() => { setError(""); setForm({ ...EMPTY_MEMBER, password: tempPassword() }); }}>+ New member</button>
      </div>
      <table className="admin-table">
        <thead><tr><th>Member</th><th>Username</th><th>Specialty</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {members.length === 0 && <tr><td colSpan={5} className="admin-empty">No members yet.</td></tr>}
          {members.map((m) => (
            <tr key={m.id} className={m.active ? "" : "tm-inactive"}>
              <td><span className="tm-avatar">{initials(m.name)}</span> {m.name}</td>
              <td><code>{m.username}</code></td>
              <td>{m.specialty || "—"}</td>
              <td>{!m.active ? "Disabled" : m.mustChangePassword ? "Waiting for first login" : m.lastLoginAt ? `Active · last login ${new Date(m.lastLoginAt).toLocaleDateString("en-GB")}` : "Active"}</td>
              <td className="actions">
                <button className="admin-btn" onClick={() => edit(m)}>Edit</button>
                <button className="admin-btn" onClick={() => reset(m)}>Reset password</button>
                <button className="admin-btn" onClick={() => toggle(m)}>{m.active ? "Disable" : "Enable"}</button>
                <button className="admin-btn admin-btn-danger" onClick={() => remove(m)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {form && (
        <div className="admin-modal-overlay" onClick={() => setForm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>New member</h2>
            <form className="admin-form" onSubmit={save}>
              <div className="admin-form-row">
                <label>Full name<input className="form-input" value={form.name} onChange={set("name")} maxLength={80} required /></label>
                <label>Specialty<input className="form-input" value={form.specialty} onChange={set("specialty")} maxLength={80} placeholder="e.g. Frontend" /></label>
              </div>
              <div className="admin-form-row">
                <label>Username<input className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} maxLength={30} placeholder="mona.adel" required /></label>
                <label>Temporary password<input className="form-input" value={form.password} onChange={set("password")} minLength={8} required /></label>
              </div>
              <p style={{ opacity: 0.7, fontSize: 13, margin: 0 }}>Username: 3–30 characters (a-z, 0-9, . _ -). The member changes the temporary password on first login.</p>
              {error && <p className="admin-error">{error}</p>}
              <div className="admin-form-actions">
                <button type="button" className="admin-btn" onClick={() => setForm(null)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary">Create member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
