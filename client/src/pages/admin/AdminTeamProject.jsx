// AdminTeamProject.jsx — one team project for the owner (/admin/team/projects/:id), loaded on
// demand. Tabs:
//   Board    — the Kanban board; "+ Task" and clicking a card open the task editor (title,
//              Markdown description, assignee, priority, due date, status, to-do steps). A task
//              waiting for review can be approved or sent back with a note right there.
//   Docs     — the project's Markdown documentation (Write / Preview), shown to every member.
//   Settings — name, summary, due date, status, members, links; delete the project.
// ?tab=settings and ?task=<id> in the address open that tab / task directly (used by AdminTeam).
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { STATUSES, STATUS_LABEL, PRIORITIES, PRIORITY_LABEL } from "../../lib/team";
import Board from "../../components/team/Board";
import MarkdownView from "../../components/team/MarkdownView";
import { ListEditor } from "./FormParts";
import { useAdminT } from "../../lib/adminI18n";

const BLANK_TASK = { title: "", description: "", assignee: "", priority: "normal", dueDate: "", status: "todo", steps: [] };

export default function AdminTeamProject() {
  const { t, lang } = useAdminT();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [error, setError] = useState("");
  const tab = params.get("tab") || "board";
  const setTab = (next) => setParams(next === "board" ? {} : { tab: next }, { replace: true });

  const load = () => api.get(`/admin/team/projects/${id}`).then(setData).catch((err) => setError(err.message));
  useEffect(() => { load(); api.get("/admin/team/members").then(setAllMembers); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // The task editor: null (closed), "new", or a task object.
  const taskParam = params.get("task");
  const [editing, setEditing] = useState(null);
  useEffect(() => {
    if (data && taskParam) setEditing(data.tasks.find((t) => t.id === taskParam) || null);
  }, [data, taskParam]);
  const closeEditor = () => { setEditing(null); if (taskParam) setParams({}, { replace: true }); };

  if (!data) return <p className={error ? "admin-error" : ""}>{error || t("Loading…")}</p>;
  const { project, tasks } = data;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="tm-admin">
      <p><Link to="/admin/team">{t("← Team")}</Link></p>
      <h1 dir="auto">{project.name} <span className="admin-sub">· {t("{done}/{total} done", { done, total: tasks.length })} · {t(project.status)}</span></h1>
      <div className="admin-toolbar">
        {[["board", "Board"], ["docs", "Docs"], ["settings", "Settings"]].map(([key, label]) => (
          <button key={key} className={`admin-btn ${tab === key ? "admin-btn-primary" : ""}`} onClick={() => setTab(key)}>{t(label)}</button>
        ))}
      </div>

      {tab === "board" && (
        <>
          {project.members.length === 0 && <p className="admin-notice">{t("Add members in Settings to assign tasks to them.")}</p>}
          <Board tasks={tasks} lang={lang} onOpen={setEditing} onAdd={() => setEditing("new")} addLabel={t("+ Task")} />
        </>
      )}
      {tab === "docs" && <DocsEditor project={project} onSaved={load} />}
      {tab === "settings" && (
        <ProjectSettings project={project} allMembers={allMembers} onSaved={load}
          onDeleted={() => navigate("/admin/team")} />
      )}

      {editing && (
        <TaskEditor
          projectId={project.id}
          members={project.members}
          task={editing === "new" ? null : editing}
          onClose={closeEditor}
          onSaved={() => { closeEditor(); load(); }}
        />
      )}
    </div>
  );
}

// ---- Task editor (modal) ----
function TaskEditor({ projectId, members, task, onClose, onSaved }) {
  const { t, lang } = useAdminT();
  const [form, setForm] = useState(() => (task ? { ...BLANK_TASK, ...task, assignee: task.assignee?.id || "" } : BLANK_TASK));
  const [preview, setPreview] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const call = async (fn) => {
    setError("");
    try { await fn(); onSaved(); } catch (err) { setError(err.message); }
  };
  const save = (e) => {
    e.preventDefault();
    const payload = { ...form, assignee: form.assignee || null };
    call(() => (task ? api.put(`/admin/team/tasks/${task.id}`, payload) : api.post(`/admin/team/projects/${projectId}/tasks`, payload)));
  };
  const remove = () => { if (confirm(t("Delete this task?"))) call(() => api.del(`/admin/team/tasks/${task.id}`)); };
  const approve = () => call(() => api.post(`/admin/team/tasks/${task.id}/approve`));
  const sendBack = () => {
    if (!note.trim()) return setError(t("Write what needs to change before sending it back."));
    call(() => api.post(`/admin/team/tasks/${task.id}/return`, { note }));
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal tm-editor" onClick={(e) => e.stopPropagation()}>
        <h2>{task ? t("Edit task") : t("New task")}</h2>

        {task?.status === "review" && (
          <div className="tm-review-box">
            <strong>{t("{name} says this task is done.", { name: task.assignee?.name || t("The member") })}</strong>
            <textarea className="form-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("If something needs to change, write it here and press Send back…")} />
            <div className="actions">
              <button type="button" className="admin-btn" onClick={sendBack}>{t("Send back")}</button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={approve}>{t("Approve ✓")}</button>
            </div>
          </div>
        )}

        <form className="admin-form" onSubmit={save}>
          <label>{t("Title")}<input className="form-input" dir="auto" value={form.title} onChange={set("title")} maxLength={200} required /></label>
          <label>
            <span className="tm-label-row">What to do (Markdown)
              <button type="button" className="admin-btn" onClick={() => setPreview(!preview)}>{preview ? t("✎ Write") : t("Preview")}</button>
            </span>
            {preview
              ? <div className="tm-preview"><MarkdownView text={form.description} empty={t("Nothing written yet.")} /></div>
              : <textarea className="form-input" dir="auto" rows={7} value={form.description} onChange={set("description")} maxLength={20000} placeholder={"## Goal\nWhat the result should be…\n\n## Notes\n- links, screenshots, acceptance criteria"} />}
          </label>
          <div className="admin-form-row">
            <label>{t("Assigned to")}
              <select className="form-input" value={form.assignee} onChange={set("assignee")}>
                <option value="">{t("— Nobody yet —")}</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.specialty ? ` · ${m.specialty}` : ""}</option>)}
              </select>
            </label>
            <label>{t("Priority")}
              <select className="form-input" value={form.priority} onChange={set("priority")}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[lang][p]}</option>)}
              </select>
            </label>
          </div>
          <div className="admin-form-row">
            <label>{t("Due date")}<input className="form-input" type="date" value={form.dueDate} onChange={set("dueDate")} /></label>
            <label>{t("Status")}
              <select className="form-input" value={form.status} onChange={set("status")}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[lang][s]}</option>)}
              </select>
            </label>
          </div>
          <StepsEditor steps={form.steps} onChange={(steps) => setForm({ ...form, steps })} />
          {error && <p className="admin-error">{error}</p>}
          <div className="admin-form-actions">
            {task && <button type="button" className="admin-btn admin-btn-danger" onClick={remove} style={{ marginInlineEnd: "auto" }}>{t("Delete")}</button>}
            <button type="button" className="admin-btn" onClick={onClose}>{t("Cancel")}</button>
            <button type="submit" className="admin-btn admin-btn-primary">{t("Save")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// The task's to-do steps: tick, edit, remove, add (the member can add their own too).
function StepsEditor({ steps, onChange }) {
  const { t } = useAdminT();
  const update = (i, patch) => onChange(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="tm-steps-edit">
      <span className="tm-steps-title">{t("To-do steps")}</span>
      {steps.length === 0 && <p className="admin-empty">{t("No steps yet — the member can add their own too.")}</p>}
      {steps.map((step, i) => (
        <div className="tm-step-row" key={step._id || i}>
          <input type="checkbox" checked={step.done} onChange={(e) => update(i, { done: e.target.checked })} aria-label={t("Done")} />
          <input className="form-input" dir="auto" value={step.text} onChange={(e) => update(i, { text: e.target.value })} maxLength={300} placeholder={t("A small step…")} />
          <button type="button" className="admin-btn admin-btn-danger" onClick={() => onChange(steps.filter((_, j) => j !== i))} aria-label={t("Remove step")}>✕</button>
        </div>
      ))}
      {steps.length < 50 && <div><button type="button" className="admin-btn" onClick={() => onChange([...steps, { text: "", done: false }])}>{t("+ Add step")}</button></div>}
    </div>
  );
}

// ---- Docs ----
function DocsEditor({ project, onSaved }) {
  const { t } = useAdminT();
  const [docs, setDocs] = useState(project.docs);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState("");
  const save = async () => {
    setStatus(t("Saving…"));
    try { await api.put(`/admin/team/projects/${project.id}`, { docs }); setStatus(t("Saved ✓")); onSaved(); } catch (err) { setStatus(err.message); }
  };
  return (
    <div className="admin-form">
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={() => setPreview(!preview)}>{preview ? t("✎ Write") : t("Preview")}</button>
        <button className="admin-btn admin-btn-primary" onClick={save}>{t("Save docs")}</button>
        <span className="admin-sub">{status}</span>
      </div>
      {preview
        ? <div className="tm-preview"><MarkdownView text={docs} empty={t("Nothing written yet.")} /></div>
        : <textarea className="form-input tm-docs-input" dir="auto" rows={22} value={docs} onChange={(e) => { setDocs(e.target.value); setStatus(""); }} maxLength={60000}
            placeholder={"# How to run it\n```\nnpm install\nnpm run dev\n```\n\n# Decisions\n- …\n\n# Accounts & environments\n- staging: …"} />}
      <p style={{ opacity: 0.7, fontSize: 13 }}>{t("Every member of the project sees this page. Don't paste passwords or secret keys here.")}</p>
    </div>
  );
}

// ---- Settings ----
function ProjectSettings({ project, allMembers, onSaved, onDeleted }) {
  const { t } = useAdminT();
  const [form, setForm] = useState({
    name: project.name, summary: project.summary, dueDate: project.dueDate, status: project.status,
    members: project.members.map((m) => m.id), links: project.links,
  });
  const [msg, setMsg] = useState("");
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggleMember = (id) => setForm({ ...form, members: form.members.includes(id) ? form.members.filter((m) => m !== id) : [...form.members, id] });

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    try { await api.put(`/admin/team/projects/${project.id}`, form); setMsg(t("Saved ✓")); onSaved(); } catch (err) { setMsg(err.message); }
  };
  const remove = async () => {
    if (!confirm(t("Delete “{name}” with all its tasks? This cannot be undone.", { name: project.name }))) return;
    await api.del(`/admin/team/projects/${project.id}`);
    onDeleted();
  };

  return (
    <form className="admin-form" onSubmit={save}>
      <div className="admin-form-row">
        <label>{t("Name")}<input className="form-input" dir="auto" value={form.name} onChange={set("name")} maxLength={120} required /></label>
        <label>{t("Status")}
          <select className="form-input" value={form.status} onChange={set("status")}>
            <option value="active">{t("Active")}</option>
            <option value="completed">{t("Completed")}</option>
            <option value="archived">{t("Archived (hidden from members)")}</option>
          </select>
        </label>
      </div>
      <div className="admin-form-row">
        <label>{t("Summary")}<input className="form-input" dir="auto" value={form.summary} onChange={set("summary")} maxLength={500} /></label>
        <label>{t("Due date")}<input className="form-input" type="date" value={form.dueDate} onChange={set("dueDate")} /></label>
      </div>
      <h2 style={{ marginTop: 10 }}>{t("Members")}</h2>
      {allMembers.length === 0 && <p className="admin-empty">{t("No members yet — add them in Team → Members.")}</p>}
      <div className="tm-member-picks">
        {allMembers.map((m) => (
          <label key={m.id} className={`admin-check tm-pick ${form.members.includes(m.id) ? "is-on" : ""}`}>
            <input type="checkbox" checked={form.members.includes(m.id)} onChange={() => toggleMember(m.id)} />
            {m.name}{m.specialty ? <span className="tm-muted"> · {m.specialty}</span> : null}{!m.active ? <span className="tm-muted"> ({t("disabled")})</span> : null}
          </label>
        ))}
      </div>
      <ListEditor
        title={t("Links (repository, design, staging…)")}
        items={form.links}
        onChange={(links) => setForm({ ...form, links })}
        blank={{ label: "", url: "" }}
        max={12}
        emptyText={t("No links yet.")}
        renderRow={(link, update) => (
          <>
            <input className="form-input" value={link.label} onChange={(e) => update({ label: e.target.value })} maxLength={60} placeholder="GitHub" />
            <input className="form-input" type="url" value={link.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://…" />
          </>
        )}
      />
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-danger" onClick={remove} style={{ marginInlineEnd: "auto" }}>{t("Delete project")}</button>
        {msg && <span style={{ alignSelf: "center" }}>{msg}</span>}
        <button type="submit" className="admin-btn admin-btn-primary">{t("Save settings")}</button>
      </div>
    </form>
  );
}
