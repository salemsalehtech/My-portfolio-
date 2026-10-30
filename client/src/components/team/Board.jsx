// Board.jsx — the Kanban board of a team project: one column per status (To do → In progress →
// Waiting for review → Done), one card per task. Used by the owner (AdminTeamProject.jsx) and by
// members (pages/team/TeamProject.jsx).
//
// Props: tasks, lang ("en" | "ar"), onOpen(task) when a card is clicked, `mine` (optional member
// id — that member's cards get a highlight), `onAdd` (optional: shows "+ Task" under To do).
import { STATUSES, STATUS_LABEL, PRIORITY_LABEL, initials, isOverdue, formatDue, stepsDone } from "../../lib/team";

export function TaskCard({ task, lang, onOpen, mine }) {
  const overdue = isOverdue(task);
  return (
    <button type="button" className={`tm-card ${mine ? "is-mine" : ""}`} onClick={() => onOpen(task)}>
      <span className="tm-card-top">
        <span className={`tm-prio is-${task.priority}`}>{PRIORITY_LABEL[lang][task.priority]}</span>
        {task.reviewNote && task.status === "doing" && <span className="tm-flag">↩</span>}
      </span>
      <span className="tm-card-title" dir="auto">{task.title}</span>
      <span className="tm-card-meta">
        {task.assignee ? (
          <span className="tm-who" title={task.assignee.name}><span className="tm-avatar">{initials(task.assignee.name)}</span>{task.assignee.name.split(" ")[0]}</span>
        ) : <span className="tm-who is-none">—</span>}
        <span className="tm-card-right">
          {task.steps.length > 0 && <span className="tm-steps">☑ {stepsDone(task)}</span>}
          {task.dueDate && <span className={`tm-due ${overdue ? "is-late" : ""}`}>{formatDue(task.dueDate, lang)}</span>}
        </span>
      </span>
    </button>
  );
}

export default function Board({ tasks, lang = "en", onOpen, mine, onAdd, addLabel = "+ Task" }) {
  return (
    <div className="tm-board">
      {STATUSES.map((status) => {
        const column = tasks.filter((t) => t.status === status);
        return (
          <section className={`tm-col is-${status}`} key={status}>
            <header className="tm-col-head">
              <span>{STATUS_LABEL[lang][status]}</span>
              <span className="tm-count">{column.length}</span>
            </header>
            <div className="tm-col-body">
              {column.map((task) => (
                <TaskCard key={task.id} task={task} lang={lang} onOpen={onOpen} mine={mine && task.assignee?.id === mine} />
              ))}
              {status === "todo" && onAdd && <button type="button" className="tm-add" onClick={onAdd}>{addLabel}</button>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
