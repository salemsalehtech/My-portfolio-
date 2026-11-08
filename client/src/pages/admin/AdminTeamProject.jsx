// AdminTeamProject.jsx — one team project for the owner (/admin/team/projects/:id), loaded on
// demand. Tabs:
//   Board    — the Kanban board; "+ Task" and clicking a card open the task editor (TeamTaskEditor.jsx:
//              Markdown description, assignee, priority, due date, status, to-do steps, comments).
//              A task waiting for review can be approved or sent back with a note right there.
//              Cards can be dragged to any column (dropping on Done counts as approving);
//              search and filters sit above the board.
//   Docs     — the project's Markdown documentation (Write / Preview), shown to every member.
//   Settings — name, summary, due date, status, members, links; delete the project; "Publish as
//              product" makes a draft product page from it (Admin → Products).
// ?tab=settings and ?task=<id> in the address open that tab / task directly (used by AdminTeam).
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { SHARED_COPY } from "../../lib/team";
import { productSlug, nameFields } from "../../lib/products";
import Board from "../../components/team/Board";
import MarkdownView from "../../components/team/MarkdownView";
import TeamTaskEditor from "./TeamTaskEditor";
import { ListEditor } from "./FormParts";
import { useAdminT } from "../../lib/adminI18n";


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

  const patchTask = (taskId, patch) => setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === taskId ? { ...x, ...patch } : x)) }));
  // Drag & drop: the card moves at once and goes back if saving fails.
  const onMove = async (task, status) => {
    setError("");
    patchTask(task.id, { status });
    try {
      patchTask(task.id, await api.put(`/admin/team/tasks/${task.id}`, { status }));
    } catch (err) {
      patchTask(task.id, { status: task.status });
      setError(err.message || SHARED_COPY[lang].moveFailed);
    }
  };

  if (!data) return <p className={error ? "admin-error" : ""}>{error || t("Loading…")}</p>;
  const { project, tasks } = data;
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="tm-admin">
      <p><Link to="/admin/team">{t("← Team")}</Link></p>
      <h1 dir="auto">{project.name} <span className="admin-sub">· {t("{done}/{total} done", { done, total: tasks.length })} · {t(project.status)}</span></h1>
      <div className="admin-toolbar ui-tabbar" role="tablist">
        {[["board", "Board"], ["docs", "Docs"], ["settings", "Settings"]].map(([key, label]) => (
          <button key={key} className={`admin-btn ${tab === key ? "admin-btn-primary" : ""}`} onClick={() => setTab(key)}>{t(label)}</button>
        ))}
      </div>

      {tab === "board" && (
        <>
          {project.members.length === 0 && <p className="admin-notice">{t("Add members in Settings to assign tasks to them.")}</p>}
          {error && <p className="admin-error">{error}</p>}
          <Board tasks={tasks} lang={lang} onOpen={setEditing} onAdd={() => setEditing("new")} addLabel={t("+ Task")}
            members={project.members} canMove={() => true} onMove={onMove} />
        </>
      )}
      {tab === "docs" && <DocsEditor project={project} onSaved={load} />}
      {tab === "settings" && (
        <ProjectSettings project={project} allMembers={allMembers} onSaved={load}
          onDeleted={() => navigate("/admin/team")} />
      )}

      {editing && (
        <TeamTaskEditor
          projectId={project.id}
          members={project.members}
          task={editing === "new" ? null : editing}
          onClose={closeEditor}
          onSaved={() => { closeEditor(); load(); }}
          onCommentCount={(n) => patchTask(editing.id, { commentCount: n })}
        />
      )}
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
    try { await api.put(`/admin/team/projects/${project.id}`, { docs }); setStatus(t("Saved")); onSaved(); } catch (err) { setStatus(err.message); }
  };
  return (
    <div className="admin-form">
      <div className="admin-toolbar">
        <button className="admin-btn" onClick={() => setPreview(!preview)}>{preview ? t("Write") : t("Preview")}</button>
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
    try { await api.put(`/admin/team/projects/${project.id}`, form); setMsg(t("Saved")); onSaved(); } catch (err) { setMsg(err.message); }
  };
  const remove = async () => {
    if (!confirm(t("Delete “{name}” with all its tasks? This cannot be undone.", { name: project.name }))) return;
    await api.del(`/admin/team/projects/${project.id}`);
    onDeleted();
  };
  const navigate = useNavigate();
  // A draft product page with this project's name and summary; finished in the product editor.
  const publishAsProduct = async () => {
    if (!confirm(t("Make a product page for “{name}”? It starts as a draft you can edit.", { name: project.name }))) return;
    try {
      const arabic = "nameAr" in nameFields(project.name);
      const product = await api.post("/admin/products", {
        ...nameFields(project.name),
        [arabic ? "summaryAr" : "summaryEn"]: project.summary,
        slug: productSlug(project.name),
        sourceProject: project.id,
      });
      navigate(`/admin/products/${product.id}`);
    } catch (err) {
      setMsg(err.message);
    }
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
        {allMembers.filter((m) => !m.pending).map((m) => (
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
        <button type="button" className="admin-btn admin-btn-danger" onClick={remove}>{t("Delete project")}</button>
        <button type="button" className="admin-btn" onClick={publishAsProduct} style={{ marginInlineEnd: "auto" }}>{t("Publish as product")}</button>
        {msg && <span style={{ alignSelf: "center" }}>{msg}</span>}
        <button type="submit" className="admin-btn admin-btn-primary">{t("Save settings")}</button>
      </div>
    </form>
  );
}
