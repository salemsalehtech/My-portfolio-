// TeamHome.jsx — the member's start page (/#/team):
//   - a greeting with today's date,
//   - "Needs attention": overdue tasks, tasks due within 2 days, and tasks sent back with notes,
//   - four numbers (open / overdue / waiting for review / recently done),
//   - today's standup (StandupCard.jsx),
//   - "My tasks" grouped by status (in progress first), as compact rows,
//   - "My projects" with their progress.
// A task opens in TeamTaskModal.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { isOverdue, today, formatDue, STATUS_LABEL, PRIORITY_LABEL, stepsDone } from "../../lib/team";
import { ListIcon, AlertIcon, EyeIcon, CheckCircleIcon, FolderIcon, ChevronIcon } from "../../components/team/icons";
import { useTeam } from "./TeamPortal";
import TeamTaskModal from "./TeamTaskModal";
import StandupCard from "./StandupCard";

const GROUPS = ["doing", "todo", "review", "done"];
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

// One task as a compact, clickable row.
export function TaskRow({ task, lang, onOpen, showProject = true }) {
  const overdue = isOverdue(task);
  return (
    <button type="button" className="tm-trow" onClick={() => onOpen(task)}>
      <span className={`tm-dot is-${task.status}`} aria-hidden="true" />
      <span className="tm-trow-main">
        <span className="tm-trow-title">{task.title}</span>
        <span className="tm-trow-sub">
          {showProject && task.project?.name && <span dir="auto">{task.project.name}</span>}
          {task.steps.length > 0 && <span>☑ {stepsDone(task)}</span>}
          {task.reviewNote && task.status === "doing" && <span className="tm-late">↩</span>}
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

export default function TeamHome() {
  const { t, lang, member } = useTeam();
  const [tasks, setTasks] = useState(null);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/team/tasks"), api.get("/team/projects")])
      .then(([tk, pr]) => { setTasks(tk); setProjects(pr); })
      .catch((err) => setError(err.message));
  }, []);

  const replaceTask = (updated) => {
    setTasks((list) => list.map((x) => (x.id === updated.id ? { ...x, ...updated, project: x.project } : x)));
    setOpen((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated, project: cur.project } : cur));
  };

  const list = tasks || [];
  const soon = inDays(2);
  const attention = list.filter((x) => x.status !== "done" && x.status !== "review" &&
    (isOverdue(x) || (x.dueDate && x.dueDate <= soon) || (x.reviewNote && x.status === "doing")));
  const stats = [
    { label: t.statOpen, value: list.filter((x) => x.status === "todo" || x.status === "doing").length, Icon: ListIcon },
    { label: t.statLate, value: list.filter(isOverdue).length, Icon: AlertIcon, tone: "late" },
    { label: t.statReview, value: list.filter((x) => x.status === "review").length, Icon: EyeIcon, tone: "review" },
    { label: t.statDone, value: list.filter((x) => x.status === "done").length, Icon: CheckCircleIcon, tone: "done" },
  ];
  const dateLine = new Date().toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main className="tm-page">
      <header className="tm-hello">
        <span className="tm-eyebrow">{dateLine}</span>
        <h1>{t.hello(member.name.split(" ")[0])}</h1>
        {member.specialty && <p className="tm-muted">{member.specialty}</p>}
      </header>
      {error && <p className="tm-error">{error}</p>}

      <div className="tm-stats">
        {stats.map(({ label, value, Icon, tone }) => (
          <div className={`tm-stat ${tone && value ? `is-${tone}` : ""}`} key={label}>
            <span className="tm-stat-icon"><Icon size={18} /></span>
            <strong>{tasks ? value : "–"}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <StandupCard />

      {tasks && (
        <section className={`tm-focus ${attention.length ? "" : "is-calm"}`}>
          <h2>{t.focus}</h2>
          {attention.length === 0 ? <p className="tm-muted">{t.focusEmpty}</p> : (
            <div className="tm-rows">
              {attention.map((task) => <TaskRow key={task.id} task={task} lang={lang} onOpen={setOpen} />)}
            </div>
          )}
        </section>
      )}

      <section className="tm-section">
        <h2>{t.myTasks}</h2>
        {tasks === null && <p className="tm-muted">{t.loading}</p>}
        {tasks && list.length === 0 && <p className="tm-empty">{t.noTasks}</p>}
        {GROUPS.map((status) => {
          const group = list.filter((x) => x.status === status)
            .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
          if (group.length === 0) return null;
          return (
            <div className="tm-group" key={status}>
              <h3 className="tm-group-title"><span className={`tm-dot is-${status}`} />{status === "done" ? t.recentlyDone : STATUS_LABEL[lang][status]}<span className="tm-count">{group.length}</span></h3>
              <div className="tm-rows">
                {group.map((task) => <TaskRow key={task.id} task={task} lang={lang} onOpen={setOpen} />)}
              </div>
            </div>
          );
        })}
      </section>

      <section className="tm-section">
        <h2>{t.myProjects}</h2>
        {projects.length === 0 && tasks && <p className="tm-empty">{t.noProjects}</p>}
        <div className="tm-projects">
          {projects.map((p) => {
            const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <Link className="tm-project" to={`/team/projects/${p.id}`} key={p.id}>
                <span className="tm-project-top">
                  <span className="tm-project-icon"><FolderIcon size={18} /></span>
                  <span className="tm-project-pct">{pct}%</span>
                </span>
                <span className="tm-project-name">{p.name}</span>
                {p.summary && <span className="tm-muted tm-project-summary">{p.summary}</span>}
                <span className="tm-bar"><span style={{ width: `${pct}%` }} /></span>
                <span className="tm-project-foot">
                  <span className="tm-muted tm-small">{t.progress(p.done, p.total)}</span>
                  {p.dueDate && <span className={`tm-small ${p.dueDate < today() ? "tm-late" : "tm-muted"}`}>{formatDue(p.dueDate, lang)}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      {open && <TeamTaskModal task={open} projectName={open.project?.name} onClose={() => setOpen(null)} onChange={replaceTask} />}
    </main>
  );
}
