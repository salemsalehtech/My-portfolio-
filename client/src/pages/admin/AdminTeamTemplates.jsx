// AdminTeamTemplates.jsx — Admin → Team → Templates: reusable tasks ("New page", "Bug fix"…) with
// the brief, steps and "Done means…" ready, picked from "Start from a template" when making a
// task. A template can also repeat: every week (on a weekday) or every month (on a day) it makes
// its task by itself in a project, for a member, due a few days later (server: lib/teamJobs.js).
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PRIORITIES, PRIORITY_LABEL, SHARED_COPY } from "../../lib/team";
import { ChecklistEditor } from "./TeamTaskEditor";
import { toast } from "../../components/Toaster";
import { useAdminT } from "../../lib/adminI18n";

const BLANK = {
  name: "", title: "", description: "", priority: "normal", steps: [], criteria: [],
  repeat: { every: "none", weekday: 0, monthDay: 1, dueInDays: 3, project: "", assignee: "" },
};
const WEEKDAYS = { en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] };

export default function AdminTeamTemplates() {
  const { t, lang } = useAdminT();
  const [list, setList] = useState(null);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [editing, setEditing] = useState(null); // a template being edited, or null
  const [error, setError] = useState("");

  const load = () => api.get("/admin/team/templates").then(setList).catch((err) => setError(err.message));
  useEffect(() => {
    load();
    api.get("/admin/team/projects").then((p) => setProjects(p.filter((x) => x.status === "active"))).catch(() => {});
    api.get("/admin/team/members").then((m) => setMembers(m.filter((x) => x.active && !x.pending))).catch(() => {});
  }, []);

  const open = (tpl) => setEditing(tpl
    ? { ...BLANK, ...tpl, repeat: { ...BLANK.repeat, ...tpl.repeat, project: tpl.repeat?.project?.id || "", assignee: tpl.repeat?.assignee?.id || "" } }
    : BLANK);
  const remove = async (tpl) => {
    if (!confirm(t("Delete {name}?", { name: tpl.name }))) return;
    await api.del(`/admin/team/templates/${tpl.id}`);
    load();
  };
  const repeatText = (r) => (r?.every === "weekly" ? t("Every {day}", { day: WEEKDAYS[lang][r.weekday] })
    : r?.every === "monthly" ? t("Every month on day {n}", { n: r.monthDay }) : "");

  return (
    <div>
      <div className="admin-toolbar"><button className="admin-btn admin-btn-primary" onClick={() => open(null)}>{t("+ Template")}</button></div>
      {error && <p className="admin-error">{error}</p>}
      {list === null && <div className="tm-skeleton" style={{ height: 80 }} />}
      {list && list.length === 0 && <p className="admin-empty">{t("No templates yet. Save the tasks you give often, once.")}</p>}
      <div className="tm-template-grid">
        {list?.map((tpl) => (
          <div key={tpl.id} className="cut-card tm-template">
            <strong dir="auto">{tpl.name}</strong>
            <span className="tm-muted tm-small" dir="auto">{tpl.title}</span>
            <span className="tm-small">
              <span className={`tm-prio is-${tpl.priority}`}>{PRIORITY_LABEL[lang][tpl.priority]}</span>
              {" "}{tpl.steps.length} {t("steps")} · {tpl.criteria.length} {t("criteria")}
            </span>
            {tpl.repeat?.every !== "none" && (
              <span className="tm-pill">{repeatText(tpl.repeat)} → {tpl.repeat.project?.name || "—"}{tpl.repeat.assignee ? ` · ${tpl.repeat.assignee.name}` : ""}</span>
            )}
            <div className="actions">
              <button className="admin-btn" onClick={() => open(tpl)}>{t("Edit")}</button>
              <button className="admin-btn admin-btn-danger" onClick={() => remove(tpl)}>{t("Delete")}</button>
            </div>
          </div>
        ))}
      </div>
      {editing && <TemplateEditor value={editing} projects={projects} members={members} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); toast(t("Saved")); load(); }} />}
    </div>
  );
}

function TemplateEditor({ value, projects, members, onClose, onSaved }) {
  const { t, lang } = useAdminT();
  const sc = SHARED_COPY[lang];
  const [form, setForm] = useState(value);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setRepeat = (key) => (e) => setForm({ ...form, repeat: { ...form.repeat, [key]: e.target.type === "number" || key === "weekday" ? Number(e.target.value) : e.target.value } });
  const project = projects.find((p) => p.id === form.repeat.project);
  const projectMembers = members.filter((m) => project?.members.includes(m.id));

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (value.id) await api.put(`/admin/team/templates/${value.id}`, form);
      else await api.post("/admin/team/templates", form);
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <form className="admin-modal admin-form tm-editor" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2>{value.id ? t("Edit template") : t("New template")}</h2>
        <div className="admin-form-row">
          <label>{t("Template name")}<input className="form-input" dir="auto" value={form.name} onChange={set("name")} maxLength={80} required placeholder={t("e.g. Bug fix")} /></label>
          <label>{t("Priority")}
            <select className="form-input" value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[lang][p]}</option>)}
            </select>
          </label>
        </div>
        <label>{t("Task title")}<input className="form-input" dir="auto" value={form.title} onChange={set("title")} maxLength={200} required /></label>
        <label>{t("What to do (Markdown)")}<textarea className="form-input" dir="auto" rows={6} value={form.description} onChange={set("description")} maxLength={20000} /></label>
        <ChecklistEditor title={sc.criteria} empty={t("Add the points that must be true for the task to count as done.")} addLabel={t("+ Add a point")}
          placeholder={t("e.g. Works on a phone screen")} items={form.criteria} max={30} checkable={false} onChange={(criteria) => setForm({ ...form, criteria })} />
        <ChecklistEditor title={t("To-do steps")} empty={t("No steps yet — the member can add their own too.")} addLabel={t("+ Add step")}
          placeholder={t("A small step…")} items={form.steps} max={50} checkable={false} onChange={(steps) => setForm({ ...form, steps })} />

        <fieldset className="tm-fieldset">
          <legend>{t("Repeat")}</legend>
          <div className="admin-form-row">
            <label>{t("Make this task by itself")}
              <select className="form-input" value={form.repeat.every} onChange={setRepeat("every")}>
                <option value="none">{t("Never (template only)")}</option>
                <option value="weekly">{t("Every week")}</option>
                <option value="monthly">{t("Every month")}</option>
              </select>
            </label>
            {form.repeat.every === "weekly" && (
              <label>{t("On")}
                <select className="form-input" value={form.repeat.weekday} onChange={setRepeat("weekday")}>
                  {WEEKDAYS[lang].map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </label>
            )}
            {form.repeat.every === "monthly" && (
              <label>{t("Day of the month")}<input className="form-input" type="number" min={1} max={28} value={form.repeat.monthDay} onChange={setRepeat("monthDay")} /></label>
            )}
          </div>
          {form.repeat.every !== "none" && (
            <div className="admin-form-row">
              <label>{t("Project")}
                <select className="form-input" value={form.repeat.project} onChange={(e) => setForm({ ...form, repeat: { ...form.repeat, project: e.target.value, assignee: "" } })} required>
                  <option value="">{t("— Pick a project —")}</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label>{t("Assigned to")}
                <select className="form-input" value={form.repeat.assignee} onChange={setRepeat("assignee")}>
                  <option value="">{t("— Nobody yet —")}</option>
                  {projectMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <label>{t("Due after (days)")}<input className="form-input" type="number" min={0} max={60} value={form.repeat.dueInDays} onChange={setRepeat("dueInDays")} /></label>
            </div>
          )}
        </fieldset>

        {error && <p className="admin-error">{error}</p>}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn" onClick={onClose}>{t("Cancel")}</button>
          <button className="admin-btn admin-btn-primary">{t("Save")}</button>
        </div>
      </form>
    </div>
  );
}
