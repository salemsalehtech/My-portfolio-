// TeamTaskModal.jsx — one task, opened from the member's home page or a project board. It slides
// in as a side sheet; the one next step ("Start", "Send for review"…) stays pinned at the bottom.
//
// For the member's OWN task: "I understood" / "I have a question" before starting, their size
// estimate, the acceptance criteria ("Done means…") and to-do steps to tick, files and voice notes
// to attach, "I need help" / "I need more time", and the status moves. The owner's review notes
// are shown at the top when the task was sent back. A teammate's task opens read-only; an open-pool
// task ("anyone can take it") shows "I'll take it".
// Anyone on the project can comment (Comments.jsx); the new count goes up with onCommentCount(n).
// Every change is saved right away (routes/team.js) and passed up with onChange(updatedTask).
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { STATUS_LABEL, PRIORITY_LABEL, SHARED_COPY, isOverdue, formatDue, today } from "../../lib/team";
import MarkdownView from "../../components/team/MarkdownView";
import Comments from "../../components/team/Comments";
import Attachments from "../../components/team/Attachments";
import { CheckIcon, XIcon } from "../../components/team/icons";
import { useTeam } from "./TeamPortal";

export default function TeamTaskModal({ task, projectName, people = [], onClose, onChange, onCommentCount }) {
  const { t, lang, member, msg } = useTeam();
  const sc = SHARED_COPY[lang];
  const mine = task.assignee?.id === member.id;
  const open = mine && task.status !== "done";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stepText, setStepText] = useState("");
  const [panel, setPanel] = useState(null); // "help" | "time" — the small form that is open
  const [helpText, setHelpText] = useState("");
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [seed, setSeed] = useState(null); // fills the comment box ("I have a question")

  // Escape closes the sheet.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Runs one change; true when it worked (so a small form can close), false on an error.
  const run = async (call) => {
    setBusy(true);
    setError("");
    try {
      onChange(await call());
      return true;
    } catch (err) {
      setError(err.message || t.error);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const base = `/team/tasks/${task.id}`;
  const setStatus = (status) => run(() => api.patch(`${base}/status`, { status }));
  const submit = (e, call, reset) => { e.preventDefault(); run(call).then((ok) => ok && reset()); };
  const addStep = (e) => {
    e.preventDefault();
    const text = stepText.trim();
    if (text) submit(e, () => api.post(`${base}/steps`, { text }), () => setStepText(""));
  };

  const overdue = isOverdue(task);
  const criteriaLeft = task.criteria?.filter((c) => !c.done).length || 0;
  return (
    <div className="tm-overlay is-sheet" onClick={onClose}>
      <div className="tm-dialog tm-task tm-sheet" role="dialog" aria-modal="true" aria-labelledby="tm-task-title" onClick={(e) => e.stopPropagation()}>
        <div className="tm-sheet-body">
          <div className="tm-task-head">
            <span className={`tm-status is-${task.status}`}>{STATUS_LABEL[lang][task.status]}</span>
            <button type="button" className="tm-close" onClick={onClose} aria-label={t.close}><XIcon size={16} /></button>
          </div>
          <h2 id="tm-task-title" dir="auto">{task.title}</h2>
          <dl className="tm-facts">
            {projectName && <div><dt>{t.project}</dt><dd dir="auto">{projectName}</dd></div>}
            <div><dt>{t.assignee}</dt><dd>{task.assignee ? task.assignee.name : "—"}</dd></div>
            <div><dt>{t.priority}</dt><dd><span className={`tm-prio is-${task.priority}`}>{PRIORITY_LABEL[lang][task.priority]}</span></dd></div>
            <div><dt>{t.due}</dt><dd className={overdue ? "tm-late" : ""}>{task.dueDate ? `${formatDue(task.dueDate, lang)}${overdue ? ` · ${t.late}` : ""}` : t.noDue}</dd></div>
            <div>
              <dt>{sc.size}</dt>
              <dd>
                {open ? (
                  <select className="tm-mini-select" value={task.estimate || ""} disabled={busy} onChange={(e) => run(() => api.put(`${base}/estimate`, { estimate: e.target.value }))}>
                    {Object.entries(sc.sizes).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                ) : sc.sizes[task.estimate || ""]}
              </dd>
            </div>
          </dl>

          {task.reviewNote && task.status !== "done" && (
            <div className="tm-review-note">
              <strong>{t.feedback}</strong>
              <p dir="auto">{task.reviewNote}</p>
            </div>
          )}

          {!task.assignee && task.claimable && task.status !== "done" && (
            <div className="tm-callout">
              <p>{sc.claimHint}</p>
              <button className="fp-btn" disabled={busy} onClick={() => run(() => api.post(`${base}/claim`))}>{sc.claim}</button>
            </div>
          )}

          {open && !task.understoodAt && (
            <div className="tm-callout">
              <button className="fp-btn" disabled={busy} onClick={() => run(() => api.post(`${base}/understood`))}><CheckIcon size={15} /> {sc.understood}</button>
              <button className="fp-btn fp-btn-ghost" onClick={() => setSeed({ text: sc.questionStart, n: Date.now() })}>{sc.askQuestion}</button>
            </div>
          )}
          {task.understoodAt && <p className="tm-muted tm-small tm-understood"><CheckIcon size={13} /> {sc.understoodOn(formatDue(task.understoodAt.slice(0, 10), lang))}</p>}

          <h3>{t.description}</h3>
          <MarkdownView text={task.description} empty={t.noDescription} />

          {task.criteria?.length > 0 && (
            <>
              <h3>{sc.criteria}</h3>
              {open && <p className="tm-muted tm-small">{sc.criteriaHint}</p>}
              <ul className="tm-steps-list tm-criteria">
                {task.criteria.map((c) => (
                  <li key={c._id} className={c.done ? "is-done" : ""}>
                    <label>
                      <input type="checkbox" checked={c.done} disabled={!open || busy} onChange={() => run(() => api.patch(`${base}/criteria/${c._id}`, { done: !c.done }))} />
                      <span dir="auto">{c.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3>{t.steps}</h3>
          {task.steps.length > 0 && (
            <ul className="tm-steps-list">
              {task.steps.map((step) => (
                <li key={step._id} className={step.done ? "is-done" : ""}>
                  <label>
                    <input type="checkbox" checked={step.done} disabled={!open || busy} onChange={() => run(() => api.patch(`${base}/steps/${step._id}`, { done: !step.done }))} />
                    <span dir="auto">{step.text}</span>
                  </label>
                  {open && <button type="button" className="tm-icon-btn" onClick={() => run(() => api.del(`${base}/steps/${step._id}`))} disabled={busy} aria-label={t.deleteStep}><XIcon size={14} /></button>}
                </li>
              ))}
            </ul>
          )}
          {open && (
            <form className="tm-step-add" onSubmit={addStep}>
              <input className="fp-input" value={stepText} onChange={(e) => setStepText(e.target.value)} placeholder={t.addStep} maxLength={300} />
              <button className="fp-btn fp-btn-ghost" type="submit" disabled={busy || !stepText.trim()}>{t.add}</button>
            </form>
          )}

          <Attachments
            path={`${base}/attachments`}
            filePath={(f) => `/team/attachments/${f.id}`}
            deletePath={(f) => `/team/attachments/${f.id}`}
            canUpload={open}
            canDelete={(f) => open && f.member?.id === member.id}
            buttonClass="fp-btn fp-btn-ghost"
            lang={lang}
            msg={msg}
          />

          {task.helpNote && (
            <div className="tm-alert-box is-help">
              <strong>{sc.helpFlag}</strong>
              <p dir="auto">{task.helpNote}</p>
              {mine && <div className="actions"><button className="fp-btn fp-btn-ghost" disabled={busy} onClick={() => run(() => api.del(`${base}/help`))}>{sc.helpSolved}</button></div>}
            </div>
          )}
          {task.extensionRequest && (
            <div className="tm-alert-box is-time">
              <strong>{sc.timeAsked(formatDue(task.extensionRequest.date, lang))}</strong>
              <p dir="auto">{task.extensionRequest.reason}</p>
              {mine && <div className="actions"><button className="fp-btn fp-btn-ghost" disabled={busy} onClick={() => run(() => api.del(`${base}/extension`))}>{sc.withdrawReq}</button></div>}
            </div>
          )}
          {open && !panel && (
            <div className="tm-ask-row">
              {!task.helpNote && <button className="fp-btn fp-btn-ghost" onClick={() => setPanel("help")}>{sc.needHelp}</button>}
              {!task.extensionRequest && <button className="fp-btn fp-btn-ghost" onClick={() => { setNewDate(""); setPanel("time"); }}>{sc.needTime}</button>}
            </div>
          )}
          {open && panel === "help" && (
            <form className="tm-ask-form" onSubmit={(e) => submit(e, () => api.put(`${base}/help`, { note: helpText }), () => { setPanel(null); setHelpText(""); })}>
              <label>{sc.helpQ}
                <textarea className="fp-input" dir="auto" rows={3} value={helpText} onChange={(e) => setHelpText(e.target.value)} maxLength={500} required autoFocus />
              </label>
              <div className="actions">
                <button type="button" className="fp-btn fp-btn-ghost" onClick={() => setPanel(null)}>{sc.cancel}</button>
                <button className="fp-btn" disabled={busy || !helpText.trim()}>{sc.sendHelp}</button>
              </div>
            </form>
          )}
          {open && panel === "time" && (
            <form className="tm-ask-form" onSubmit={(e) => submit(e, () => api.put(`${base}/extension`, { date: newDate, reason }), () => { setPanel(null); setReason(""); })}>
              <label>{sc.newDate}
                <input className="fp-input" type="date" value={newDate} min={task.dueDate && task.dueDate >= today() ? task.dueDate : today()} onChange={(e) => setNewDate(e.target.value)} required />
              </label>
              <label>{sc.whyTime}
                <textarea className="fp-input" dir="auto" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required />
              </label>
              <div className="actions">
                <button type="button" className="fp-btn fp-btn-ghost" onClick={() => setPanel(null)}>{sc.cancel}</button>
                <button className="fp-btn" disabled={busy || !newDate || !reason.trim()}>{sc.sendTime}</button>
              </div>
            </form>
          )}

          <Comments
            path={`${base}/comments`}
            deletePath={(x) => `/team/comments/${x.id}`}
            canDelete={(x) => x.member?.id === member.id}
            lang={lang}
            msg={msg}
            me={member.id}
            people={people}
            seed={seed}
            onCount={onCommentCount}
          />
        </div>

        {/* The one next step, always in reach. */}
        <div className="tm-sheet-foot">
          {error && <p className="tm-error" role="alert">{msg(error)}</p>}
          {!mine && task.assignee && <p className="tm-muted">{t.readOnly}</p>}
          {mine && task.status === "todo" && <button className="fp-btn" disabled={busy} onClick={() => setStatus("doing")}>{t.start}</button>}
          {mine && (task.status === "todo" || task.status === "doing") && (
            <button className={`fp-btn ${task.status === "todo" ? "fp-btn-ghost" : ""}`} disabled={busy} onClick={() => setStatus("review")}
              title={criteriaLeft ? `${criteriaLeft} × ${sc.criteria}` : undefined}>
              {t.submit}{criteriaLeft ? ` (${task.criteria.length - criteriaLeft}/${task.criteria.length})` : ""}
            </button>
          )}
          {mine && task.status === "doing" && <button className="fp-btn fp-btn-ghost" disabled={busy} onClick={() => setStatus("todo")}>{t.backTodo}</button>}
          {mine && task.status === "review" && (
            <>
              <p className="tm-muted">{t.inReview}</p>
              <button className="fp-btn fp-btn-ghost" disabled={busy} onClick={() => setStatus("doing")}>{t.withdraw}</button>
            </>
          )}
          {task.status === "done" && <p className="tm-done-text"><CheckIcon size={15} /> {t.approved}</p>}
        </div>
      </div>
    </div>
  );
}
