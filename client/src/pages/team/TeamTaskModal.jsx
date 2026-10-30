// TeamTaskModal.jsx — one task, opened from the member's task list or a project board.
//
// For the member's OWN task: change the status (Start → I'm done, send for review; or back),
// and manage the to-do steps (tick, add, delete). If the owner sent the task back, their review
// notes are shown at the top. A teammate's task opens read-only.
// Every change is saved right away (routes/team.js) and passed up with onChange(updatedTask).
import { useState } from "react";
import { api } from "../../lib/api";
import { STATUS_LABEL, PRIORITY_LABEL, isOverdue, formatDue } from "../../lib/team";
import MarkdownView from "../../components/team/MarkdownView";
import { useTeam } from "./TeamPortal";

export default function TeamTaskModal({ task, projectName, onClose, onChange }) {
  const { t, lang, member } = useTeam();
  const mine = task.assignee?.id === member.id;
  const [stepText, setStepText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (call) => {
    setBusy(true);
    setError("");
    try {
      onChange(await call());
    } catch (err) {
      setError(err.message || t.error);
    } finally {
      setBusy(false);
    }
  };
  const setStatus = (status) => run(() => api.patch(`/team/tasks/${task.id}/status`, { status }));
  const toggleStep = (step) => run(() => api.patch(`/team/tasks/${task.id}/steps/${step._id}`, { done: !step.done }));
  const deleteStep = (step) => run(() => api.del(`/team/tasks/${task.id}/steps/${step._id}`));
  const addStep = (e) => {
    e.preventDefault();
    const text = stepText.trim();
    if (!text) return;
    setStepText("");
    run(() => api.post(`/team/tasks/${task.id}/steps`, { text }));
  };

  const overdue = isOverdue(task);
  return (
    <div className="tm-overlay" onClick={onClose}>
      <div className="tm-dialog tm-task" role="dialog" aria-modal="true" aria-labelledby="tm-task-title" onClick={(e) => e.stopPropagation()}>
        <div className="tm-task-head">
          <span className={`tm-status is-${task.status}`}>{STATUS_LABEL[lang][task.status]}</span>
          <button type="button" className="tm-close" onClick={onClose} aria-label={t.close}>✕</button>
        </div>
        <h2 id="tm-task-title">{task.title}</h2>
        <dl className="tm-facts">
          {projectName && <div><dt>{t.project}</dt><dd dir="auto">{projectName}</dd></div>}
          <div><dt>{t.assignee}</dt><dd>{task.assignee ? task.assignee.name : "—"}</dd></div>
          <div><dt>{t.priority}</dt><dd><span className={`tm-prio is-${task.priority}`}>{PRIORITY_LABEL[lang][task.priority]}</span></dd></div>
          <div><dt>{t.due}</dt><dd className={overdue ? "tm-late" : ""}>{task.dueDate ? `${formatDue(task.dueDate, lang)}${overdue ? ` · ${t.late}` : ""}` : t.noDue}</dd></div>
        </dl>

        {task.reviewNote && task.status !== "done" && (
          <div className="tm-review-note">
            <strong>{t.feedback}</strong>
            <p dir="auto">{task.reviewNote}</p>
          </div>
        )}

        <h3>{t.description}</h3>
        <MarkdownView text={task.description} empty={t.noDescription} />

        <h3>{t.steps}</h3>
        {task.steps.length > 0 && (
          <ul className="tm-steps-list">
            {task.steps.map((step) => (
              <li key={step._id} className={step.done ? "is-done" : ""}>
                <label>
                  <input type="checkbox" checked={step.done} disabled={!mine || busy || task.status === "done"} onChange={() => toggleStep(step)} />
                  <span dir="auto">{step.text}</span>
                </label>
                {mine && task.status !== "done" && (
                  <button type="button" className="tm-icon-btn" onClick={() => deleteStep(step)} disabled={busy} aria-label={t.deleteStep}>✕</button>
                )}
              </li>
            ))}
          </ul>
        )}
        {mine && task.status !== "done" && (
          <form className="tm-step-add" onSubmit={addStep}>
            <input className="fp-input" value={stepText} onChange={(e) => setStepText(e.target.value)} placeholder={t.addStep} maxLength={300} />
            <button className="fp-btn fp-btn-ghost" type="submit" disabled={busy || !stepText.trim()}>{t.add}</button>
          </form>
        )}

        {error && <p className="tm-error" role="alert">{error}</p>}
        <div className="tm-task-actions">
          {!mine && <p className="tm-muted">{t.readOnly}</p>}
          {mine && task.status === "todo" && <button className="fp-btn" disabled={busy} onClick={() => setStatus("doing")}>{t.start}</button>}
          {mine && (task.status === "todo" || task.status === "doing") && (
            <button className={`fp-btn ${task.status === "todo" ? "fp-btn-ghost" : ""}`} disabled={busy} onClick={() => setStatus("review")}>{t.submit}</button>
          )}
          {mine && task.status === "doing" && <button className="fp-btn fp-btn-ghost" disabled={busy} onClick={() => setStatus("todo")}>{t.backTodo}</button>}
          {mine && task.status === "review" && (
            <>
              <p className="tm-muted">{t.inReview}</p>
              <button className="fp-btn fp-btn-ghost" disabled={busy} onClick={() => setStatus("doing")}>{t.withdraw}</button>
            </>
          )}
          {task.status === "done" && <p className="tm-done-text">{t.approved}</p>}
        </div>
      </div>
    </div>
  );
}
