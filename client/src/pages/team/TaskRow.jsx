// TaskRow.jsx — one task as a compact, clickable row (status dot, title, project, steps, priority,
// due date). Used by the portal's Home and My tasks tabs; clicking opens the task window.
import { isOverdue, formatDue, PRIORITY_LABEL, stepsDone } from "../../lib/team";
import { CheckSquareIcon, ReplyIcon, ChevronIcon, AlertIcon, ClockIcon } from "../../components/team/icons";

export default function TaskRow({ task, lang, onOpen, showProject = true }) {
  const overdue = isOverdue(task);
  return (
    <button type="button" className="tm-trow" onClick={() => onOpen(task)}>
      <span className={`tm-dot is-${task.status}`} aria-hidden="true" />
      <span className="tm-trow-main">
        <span className="tm-trow-title" dir="auto">{task.title}</span>
        <span className="tm-trow-sub">
          {showProject && task.project?.name && <span dir="auto">{task.project.name}</span>}
          {task.steps.length > 0 && <span><CheckSquareIcon size={13} className="ui-icon" /> {stepsDone(task)}</span>}
          {task.reviewNote && task.status === "doing" && <span className="tm-late"><ReplyIcon size={14} className="ui-icon" /></span>}
          {task.helpNote && <span className="tm-flag is-help"><AlertIcon size={13} /></span>}
          {task.extensionRequest && <span className="tm-flag is-time"><ClockIcon size={13} /></span>}
        </span>
      </span>
      <span className="tm-trow-end">
        <span className={`tm-prio is-${task.priority}`}>{PRIORITY_LABEL[lang][task.priority]}</span>
        {task.dueDate && <span className={`tm-due ${overdue ? "is-late" : ""}`}>{formatDue(task.dueDate, lang)}</span>}
        <ChevronIcon size={16} className="tm-trow-chev" />
      </span>
    </button>
  );
}
