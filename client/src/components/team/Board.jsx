// Board.jsx — the Kanban board of a team project: one column per status (To do → In progress →
// Waiting for review → Done), one card per task. Used by the owner (AdminTeamProject.jsx) and by
// members (pages/team/TeamProject.jsx).
//
// Props: tasks, lang ("en" | "ar"), onOpen(task) when a card is clicked, `mine` (optional member
// id — that member's cards get a highlight and the "Only mine" filter), `onAdd` (optional: shows
// "+ Task" under To do), `members` (for the "assigned to" filter).
// Drag & drop: `canMove(task, status)` says whether a card may be dropped on a column, and
// `onMove(task, status)` saves it. Without them the cards can't be dragged. On touch screens
// (no HTML drag & drop) the status is changed from inside the task instead.
// Above the board: search + filters (assignee, priority, overdue only).
import { useState } from "react";
import { STATUSES, PRIORITIES, STATUS_LABEL, PRIORITY_LABEL, SHARED_COPY, initials, isOverdue, formatDue, stepsDone } from "../../lib/team";

export function TaskCard({ task, lang, onOpen, mine, draggable, onDragStart, onDragEnd, dragging }) {
  const overdue = isOverdue(task);
  return (
    <button
      type="button"
      className={`tm-card ${mine ? "is-mine" : ""} ${draggable ? "is-draggable" : ""} ${dragging ? "is-dragging" : ""}`}
      onClick={() => onOpen(task)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <span className="tm-card-top">
        <span className={`tm-prio is-${task.priority}`}>{PRIORITY_LABEL[lang][task.priority]}</span>
        {task.reviewNote && task.status === "doing" && <span className="tm-flag">↩</span>}
      </span>
      <span className="tm-card-title">{task.title}</span>
      <span className="tm-card-meta">
        {task.assignee ? (
          <span className="tm-who" title={task.assignee.name}><span className="tm-avatar">{initials(task.assignee.name)}</span>{task.assignee.name.split(" ")[0]}</span>
        ) : <span className="tm-who is-none">—</span>}
        <span className="tm-card-right">
          {task.commentCount > 0 && <span className="tm-steps" title={SHARED_COPY[lang].comments}>💬 {task.commentCount}</span>}
          {task.steps.length > 0 && <span className="tm-steps">☑ {stepsDone(task)}</span>}
          {task.dueDate && <span className={`tm-due ${overdue ? "is-late" : ""}`}>{formatDue(task.dueDate, lang)}</span>}
        </span>
      </span>
    </button>
  );
}

const NO_FILTER = { q: "", who: "", priority: "", late: false };

// Applies the search box and filters. `who`: "" (everyone), "none" (unassigned) or a member id.
function filterTasks(tasks, f) {
  const q = f.q.trim().toLowerCase();
  return tasks.filter((t) =>
    (!q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)) &&
    (!f.who || (f.who === "none" ? !t.assignee : t.assignee?.id === f.who)) &&
    (!f.priority || t.priority === f.priority) &&
    (!f.late || isOverdue(t)));
}

export default function Board({ tasks, lang = "en", onOpen, mine, onAdd, addLabel = "+ Task", members = [], canMove, onMove }) {
  const c = SHARED_COPY[lang];
  const [filter, setFilter] = useState(NO_FILTER);
  const [dragged, setDragged] = useState(null); // the task being dragged
  const [over, setOver] = useState(null); // the column under it
  const set = (key) => (e) => setFilter({ ...filter, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const shown = filterTasks(tasks, filter);
  const filtered = JSON.stringify(filter) !== JSON.stringify(NO_FILTER);
  const allowed = (status) => Boolean(dragged && canMove && dragged.status !== status && canMove(dragged, status));
  const people = members.length ? members : [...new Map(tasks.filter((t) => t.assignee).map((t) => [t.assignee.id, t.assignee])).values()];

  const drop = (status) => (e) => {
    e.preventDefault();
    if (allowed(status)) onMove(dragged, status);
    setDragged(null);
    setOver(null);
  };

  return (
    <>
      <div className="tm-filters">
        <input className="fp-input tm-search" type="search" value={filter.q} onChange={set("q")} placeholder={c.search} aria-label={c.search} />
        <select className="fp-input" value={filter.who} onChange={set("who")} aria-label={c.everyone}>
          <option value="">{c.everyone}</option>
          {mine && <option value={mine}>{c.onlyMine}</option>}
          {people.filter((m) => m.id !== mine).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          <option value="none">{c.unassigned}</option>
        </select>
        <select className="fp-input" value={filter.priority} onChange={set("priority")} aria-label={c.anyPriority}>
          <option value="">{c.anyPriority}</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[lang][p]}</option>)}
        </select>
        <label className="tm-check"><input type="checkbox" checked={filter.late} onChange={set("late")} />{c.onlyLate}</label>
        {filtered && (
          <>
            <span className="tm-muted tm-small">{c.shown(shown.length, tasks.length)}</span>
            <button type="button" className="tm-link-btn" onClick={() => setFilter(NO_FILTER)}>{c.clear}</button>
          </>
        )}
      </div>
      {canMove && <p className="tm-muted tm-small tm-drag-hint">{c.dragHint}</p>}

      <div className="tm-board">
        {STATUSES.map((status) => {
          const column = shown.filter((t) => t.status === status);
          const target = allowed(status);
          return (
            <section
              className={`tm-col is-${status} ${dragged ? (target ? "is-target" : "is-blocked") : ""} ${over === status && target ? "is-over" : ""}`}
              key={status}
              onDragOver={(e) => { if (target) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== status) setOver(status); } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
              onDrop={drop(status)}
            >
              <header className="tm-col-head">
                <span>{STATUS_LABEL[lang][status]}</span>
                <span className="tm-count">{column.length}</span>
              </header>
              <div className="tm-col-body">
                {column.map((task) => {
                  const movable = Boolean(canMove && STATUSES.some((s) => s !== task.status && canMove(task, s)));
                  return (
                    <TaskCard
                      key={task.id} task={task} lang={lang} onOpen={onOpen}
                      mine={mine && task.assignee?.id === mine}
                      draggable={movable}
                      dragging={dragged?.id === task.id}
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", task.id); setDragged(task); }}
                      onDragEnd={() => { setDragged(null); setOver(null); }}
                    />
                  );
                })}
                {status === "todo" && onAdd && <button type="button" className="tm-add" onClick={onAdd}>{addLabel}</button>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
