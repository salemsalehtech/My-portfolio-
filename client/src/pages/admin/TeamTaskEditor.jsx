// TeamTaskEditor.jsx — the owner's task window (opened from a project board, AdminTeamProject.jsx).
//
//   - write the task: title, brief (Markdown, with a ready "Brief template" and — when an AI key is
//     set on the server — "Improve with AI"), assignee, priority, due date, status, to-do steps,
//     "Done means…" acceptance criteria, files / voice notes / marked-up screenshots, and
//     "anyone on the project can take it" (the open pool);
//   - a new task can start from a saved template (Team → Templates);
//   - the member's signals: "needs help", "asked for more time", "understood", their size estimate;
//   - review: approve with a private rating (quality, creativity, conduct + bonus for going beyond
//     the task) or send back with notes; rate later or send a thank-you note once it's done;
//   - the task's comments (with replies and @mentions).
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { STATUSES, STATUS_LABEL, PRIORITIES, PRIORITY_LABEL, SHARED_COPY, BRIEF_TEMPLATE, formatDue } from "../../lib/team";
import MarkdownView from "../../components/team/MarkdownView";
import Comments from "../../components/team/Comments";
import Attachments, { uploadAttachment } from "../../components/team/Attachments";
import RatingInput from "../../components/team/RatingInput";
import { SparkIcon, CheckIcon, XIcon } from "../../components/team/icons";
import { toast } from "../../components/Toaster";
import { useAdminT } from "../../lib/adminI18n";

const BLANK_TASK = { title: "", description: "", assignee: "", priority: "normal", dueDate: "", status: "todo", steps: [], criteria: [], claimable: false };
const NO_RATING = { quality: 0, creativity: 0, conduct: 0, bonus: 0, note: "" };
const rated = (r) => r.quality > 0 && r.creativity > 0 && r.conduct > 0;

// Asked once per page load: is "Improve with AI" set up on the server?
let aiStatus = null;
const aiEnabled = () => (aiStatus ||= api.get("/admin/team/ai").then((r) => r.enabled).catch(() => false));

export default function TeamTaskEditor({ projectId, members, task, onClose, onSaved, onCommentCount }) {
  const { t, lang } = useAdminT();
  const sc = SHARED_COPY[lang];
  const [form, setForm] = useState(() => (task ? { ...BLANK_TASK, ...task, assignee: task.assignee?.id || "" } : BLANK_TASK));
  const [preview, setPreview] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]); // picked for a new task, uploaded once it exists
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [ai, setAi] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [undoText, setUndoText] = useState(null); // the description before "Improve with AI"
  const [rating, setRating] = useState(task?.rating || NO_RATING);
  const [thanks, setThanks] = useState(null); // the thank-you note being written, or null
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    aiEnabled().then(setAi);
    if (!task) api.get("/admin/team/templates").then(setTemplates).catch(() => {});
  }, [task]);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Runs a call that changes the task, then closes the editor and reloads the board.
  const call = async (fn, done) => {
    setError("");
    try { await fn(); if (done) toast(done); onSaved(); } catch (err) { setError(err.message); }
  };
  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, assignee: form.assignee || null, claimable: !form.assignee && form.claimable };
    if (task) return call(() => api.put(`/admin/team/tasks/${task.id}`, payload), t("Saved"));
    setSaving(true);
    setError("");
    let created = null;
    try {
      created = await api.post(`/admin/team/projects/${projectId}/tasks`, payload);
      for (const file of files) await uploadAttachment(`/admin/team/tasks/${created.id}/attachments`, file);
      toast(t("Saved"));
      onSaved();
    } catch (err) {
      setSaving(false);
      if (!created) return setError(err.message);
      // The task exists already, so pressing Save again would make a second one: close the editor
      // and let the owner open the task to attach the missing file.
      toast(`${t("The task was saved, but a file failed — open the task to attach it again.")} ${err.message}`, { tone: "error", ms: 7000 });
      onSaved();
    }
  };
  const remove = () => { if (confirm(t("Delete this task?"))) call(() => api.del(`/admin/team/tasks/${task.id}`)); };
  const approve = () => call(() => api.post(`/admin/team/tasks/${task.id}/approve`, { rating: rated(rating) ? rating : null }), t("Approved"));
  const sendBack = () => {
    if (!note.trim()) return setError(t("Write what needs to change before sending it back."));
    call(() => api.post(`/admin/team/tasks/${task.id}/return`, { note }), t("Sent back"));
  };
  const saveRating = () => call(() => api.put(`/admin/team/tasks/${task.id}/rating`, rating), t("Rating saved"));
  const sendThanks = (e) => {
    e.preventDefault();
    call(() => api.post("/admin/team/kudos", { member: task.assignee.id, task: task.id, message: thanks }), t("Thank-you note sent"));
  };

  const useTemplate = (id) => {
    const tpl = templates.find((x) => x.id === id);
    if (!tpl) return;
    setForm({
      ...form, title: tpl.title, description: tpl.description, priority: tpl.priority,
      steps: tpl.steps.map((s) => ({ text: s.text, done: false })), criteria: tpl.criteria.map((c) => ({ text: c.text, done: false })),
    });
  };
  const improve = async () => {
    setAiBusy(true);
    setError("");
    try {
      const { text } = await api.post("/admin/team/ai/brief", { text: [form.title, form.description].filter(Boolean).join("\n\n"), lang });
      setUndoText(form.description);
      setForm((f) => ({ ...f, description: text }));
      setPreview(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setAiBusy(false);
    }
  };

  const ratingFields = (
    <div className="tm-rating-grid">
      <RatingInput label={t("Quality")} value={rating.quality} onChange={(v) => setRating({ ...rating, quality: v })} />
      <RatingInput label={t("Creativity")} value={rating.creativity} onChange={(v) => setRating({ ...rating, creativity: v })} />
      <RatingInput label={t("Manners & communication")} value={rating.conduct} onChange={(v) => setRating({ ...rating, conduct: v })} />
      <RatingInput label={t("Bonus — did more than asked")} value={rating.bonus} min={0} max={3} onChange={(v) => setRating({ ...rating, bonus: v })} />
      <input className="form-input" dir="auto" value={rating.note} onChange={(e) => setRating({ ...rating, note: e.target.value })} maxLength={500} placeholder={t("Private note (only you see the rating)")} />
    </div>
  );

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal tm-editor" onClick={(e) => e.stopPropagation()}>
        <div className="tm-editor-head">
          <h2>{task ? t("Edit task") : t("New task")}</h2>
          <button type="button" className="tm-close" onClick={onClose} aria-label={t("Close")}><XIcon size={16} /></button>
        </div>

        {task && (task.understoodAt || task.estimate) && (
          <p className="tm-muted tm-small tm-signals">
            {task.understoodAt && <span><CheckIcon size={13} /> {sc.understoodOn(formatDue(task.understoodAt.slice(0, 10), lang))}</span>}
            {task.estimate && <span>{sc.size}: {sc.sizes[task.estimate]}</span>}
          </p>
        )}

        {task?.status === "review" && (
          <div className="tm-review-box">
            <strong>{t("{name} says this task is done.", { name: task.assignee?.name || t("The member") })}</strong>
            {task.criteria?.length > 0 && <p className="tm-small">{sc.criteria} {task.criteria.filter((c) => c.done).length}/{task.criteria.length}</p>}
            <details>
              <summary>{t("Rate this work (optional, private)")}</summary>
              {ratingFields}
            </details>
            <textarea className="form-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("If something needs to change, write it here and press Send back…")} />
            <div className="actions">
              <button type="button" className="admin-btn" onClick={sendBack}>{t("Send back")}</button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={approve}>{t("Approve")}</button>
            </div>
          </div>
        )}
        {task?.status === "done" && task.assignee && (
          <div className="tm-review-box is-done">
            <details>
              <summary>{task.rating ? t("Your rating") : t("Rate this work (optional, private)")}</summary>
              {ratingFields}
              <div className="actions"><button type="button" className="admin-btn" onClick={saveRating} disabled={!rated(rating)}>{t("Save rating")}</button></div>
            </details>
            {thanks === null
              ? <div className="actions"><button type="button" className="admin-btn" onClick={() => setThanks("")}>{t("Send a thank-you note")}</button></div>
              : (
                <form className="tm-thanks" onSubmit={sendThanks}>
                  <textarea className="form-input" dir="auto" rows={2} value={thanks} onChange={(e) => setThanks(e.target.value)} maxLength={500} required autoFocus
                    placeholder={t("e.g. The login page is clean and fast — great job.")} />
                  <div className="actions">
                    <button type="button" className="admin-btn" onClick={() => setThanks(null)}>{t("Cancel")}</button>
                    <button className="admin-btn admin-btn-primary" disabled={!thanks.trim()}>{t("Send")}</button>
                  </div>
                </form>
              )}
          </div>
        )}

        {task?.helpNote && (
          <div className="tm-alert-box is-help">
            <strong>{sc.helpFlag} · {task.assignee?.name}</strong>
            <p dir="auto">{task.helpNote}</p>
            <div className="actions">
              <button type="button" className="admin-btn" onClick={() => call(() => api.put(`/admin/team/tasks/${task.id}`, { helpNote: "" }))}>{sc.helpSolved}</button>
            </div>
          </div>
        )}
        {task?.extensionRequest && (
          <div className="tm-alert-box is-time">
            <strong>{sc.timeFlag} · {formatDue(task.dueDate, lang) || "—"} → {formatDue(task.extensionRequest.date, lang)}</strong>
            <p dir="auto">{task.extensionRequest.reason}</p>
            <div className="actions">
              <button type="button" className="admin-btn" onClick={() => call(() => api.post(`/admin/team/tasks/${task.id}/extension`, { approve: false }))}>{sc.keepDate}</button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => call(() => api.post(`/admin/team/tasks/${task.id}/extension`, { approve: true }))}>{sc.grant(formatDue(task.extensionRequest.date, lang))}</button>
            </div>
          </div>
        )}

        <form className="admin-form" onSubmit={save}>
          {!task && templates.length > 0 && (
            <label>{t("Start from a template")}
              <select className="form-input" defaultValue="" onChange={(e) => useTemplate(e.target.value)}>
                <option value="">{t("— Blank task —")}</option>
                {templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
          )}
          <label>{t("Title")}<input className="form-input" dir="auto" value={form.title} onChange={set("title")} maxLength={200} required /></label>
          <label>
            <span className="tm-label-row">{t("What to do (Markdown)")}
              <span className="tm-label-actions">
                {!form.description.trim() && <button type="button" className="admin-btn" onClick={() => setForm({ ...form, description: BRIEF_TEMPLATE[lang] })}>{t("Brief template")}</button>}
                {ai && (
                  <button type="button" className="admin-btn" onClick={improve} disabled={aiBusy || !(form.title.trim() || form.description.trim())} title={t("Turns rough notes into a clear brief. Don't paste passwords or keys.")}>
                    <SparkIcon size={15} /> {aiBusy ? t("Writing…") : t("Improve with AI")}
                  </button>
                )}
                {undoText !== null && <button type="button" className="admin-btn" onClick={() => { setForm({ ...form, description: undoText }); setUndoText(null); }}>{t("Undo")}</button>}
                <button type="button" className="admin-btn" onClick={() => setPreview(!preview)}>{preview ? t("Write") : t("Preview")}</button>
              </span>
            </span>
            {preview
              ? <div className="tm-preview"><MarkdownView text={form.description} empty={t("Nothing written yet.")} /></div>
              : <textarea className="form-input" dir="auto" rows={8} value={form.description} onChange={set("description")} maxLength={20000} placeholder={t("Goal, why it matters, exactly what to do… (or press Brief template)")} />}
          </label>
          <div className="admin-form-row">
            <label>{t("Assigned to")}
              <select className="form-input" value={form.assignee} onChange={set("assignee")}>
                <option value="">{t("— Nobody yet —")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.specialty ? ` · ${m.specialty}` : ""}
                    {m.availability && m.availability.status !== "available" ? ` — ${sc.avail[m.availability.status]}${m.availability.until ? ` (${formatDue(m.availability.until, lang)})` : ""}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>{t("Priority")}
              <select className="form-input" value={form.priority} onChange={set("priority")}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[lang][p]}</option>)}
              </select>
            </label>
          </div>
          {!form.assignee && (
            <label className="tm-check">
              <input type="checkbox" checked={form.claimable} onChange={(e) => setForm({ ...form, claimable: e.target.checked })} />
              {t("Anyone on the project can take it (open pool)")}
            </label>
          )}
          <div className="admin-form-row">
            <label>{t("Due date")}<input className="form-input" type="date" value={form.dueDate} onChange={set("dueDate")} /></label>
            <label>{t("Status")}
              <select className="form-input" value={form.status} onChange={set("status")}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[lang][s]}</option>)}
              </select>
            </label>
          </div>
          <ChecklistEditor title={sc.criteria} empty={t("Add the points that must be true for the task to count as done.")}
            addLabel={t("+ Add a point")} placeholder={t("e.g. Works on a phone screen")} items={form.criteria} max={30}
            onChange={(criteria) => setForm({ ...form, criteria })} />
          <ChecklistEditor title={t("To-do steps")} empty={t("No steps yet — the member can add their own too.")}
            addLabel={t("+ Add step")} placeholder={t("A small step…")} items={form.steps} max={50}
            onChange={(steps) => setForm({ ...form, steps })} />
          <Attachments
            path={task ? `/admin/team/tasks/${task.id}/attachments` : null}
            filePath={(f) => `/admin/team/attachments/${f.id}`}
            deletePath={(f) => `/admin/team/attachments/${f.id}`}
            canUpload
            canDelete={() => true}
            queue={files}
            onQueue={setFiles}
            lang={lang}
          />
          {error && <p className="admin-error">{error}</p>}
          <div className="admin-form-actions">
            {task && <button type="button" className="admin-btn admin-btn-danger" onClick={remove} style={{ marginInlineEnd: "auto" }}>{t("Delete")}</button>}
            <button type="button" className="admin-btn" onClick={onClose}>{t("Cancel")}</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>{saving ? t("Saving…") : t("Save")}</button>
          </div>
        </form>
        {task && (
          <Comments
            path={`/admin/team/tasks/${task.id}/comments`}
            deletePath={(x) => `/admin/team/comments/${x.id}`}
            canDelete={() => true}
            lang={lang}
            people={members}
            onCount={onCommentCount}
          />
        )}
      </div>
    </div>
  );
}

// A checklist the owner edits (to-do steps, acceptance criteria): tick, edit, remove, add.
// Also used by the task templates (AdminTeamTemplates.jsx) with checkable={false}.
export function ChecklistEditor({ title, empty, addLabel, placeholder, items, max, onChange, checkable = true }) {
  const { t } = useAdminT();
  const update = (i, patch) => onChange(items.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="tm-steps-edit">
      <span className="tm-steps-title">{title}</span>
      {items.length === 0 && <p className="admin-empty">{empty}</p>}
      {items.map((item, i) => (
        <div className="tm-step-row" key={item._id || i}>
          {checkable && <input type="checkbox" checked={Boolean(item.done)} onChange={(e) => update(i, { done: e.target.checked })} aria-label={t("Done")} />}
          <input className="form-input" dir="auto" value={item.text} onChange={(e) => update(i, { text: e.target.value })} maxLength={300} placeholder={placeholder} />
          <button type="button" className="admin-btn admin-btn-danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("Remove")}><XIcon size={14} /></button>
        </div>
      ))}
      {items.length < max && <div><button type="button" className="admin-btn" onClick={() => onChange([...items, { text: "", done: false }])}>{addLabel}</button></div>}
    </div>
  );
}
