// TeamHome.jsx — the member's start page (/#/team): a few numbers (open / overdue / waiting for
// review / recently done), "My tasks" (in progress first, then to do, waiting for review, done)
// and "My projects" with their progress. A task opens in TeamTaskModal.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { isOverdue } from "../../lib/team";
import { TaskCard } from "../../components/team/Board";
import { TeamTopbar, useTeam } from "./TeamPortal";
import TeamTaskModal from "./TeamTaskModal";

const ORDER = { doing: 0, todo: 1, review: 2, done: 3 };

export default function TeamHome() {
  const { t, lang, member } = useTeam();
  const [tasks, setTasks] = useState(null);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([api.get("/team/tasks"), api.get("/team/projects")])
      .then(([tk, pr]) => { setTasks(tk); setProjects(pr); })
      .catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  const replaceTask = (updated) => {
    setTasks((list) => list.map((x) => (x.id === updated.id ? { ...updated, project: x.project } : x)));
    setOpen((cur) => (cur && cur.id === updated.id ? { ...updated, project: cur.project } : cur));
  };

  const sorted = [...(tasks || [])].sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const stats = [
    { label: t.statOpen, value: sorted.filter((x) => x.status === "todo" || x.status === "doing").length },
    { label: t.statLate, value: sorted.filter(isOverdue).length, tone: "late" },
    { label: t.statReview, value: sorted.filter((x) => x.status === "review").length },
    { label: t.statDone, value: sorted.filter((x) => x.status === "done").length, tone: "done" },
  ];

  return (
    <>
      <TeamTopbar />
      <main className="tm-page">
        <header className="tm-hello">
          <h1>{t.hello(member.name.split(" ")[0])}</h1>
          {member.specialty && <p className="tm-muted">{member.specialty}</p>}
        </header>
        {error && <p className="tm-error">{error}</p>}

        <div className="tm-stats">
          {stats.map((s) => (
            <div className={`tm-stat ${s.tone && s.value ? `is-${s.tone}` : ""}`} key={s.label}>
              <strong>{tasks ? s.value : "–"}</strong><span>{s.label}</span>
            </div>
          ))}
        </div>

        <section className="tm-section">
          <h2>{t.myTasks}</h2>
          {tasks === null && <p className="tm-muted">{t.loading}</p>}
          {tasks && sorted.length === 0 && <p className="tm-empty">{t.noTasks}</p>}
          <div className="tm-task-list">
            {sorted.map((task) => (
              <div className="tm-task-row" key={task.id}>
                <span className="tm-task-project">{task.project.name}</span>
                <TaskCard task={task} lang={lang} onOpen={setOpen} />
              </div>
            ))}
          </div>
        </section>

        <section className="tm-section">
          <h2>{t.myProjects}</h2>
          {projects.length === 0 && tasks && <p className="tm-empty">{t.noProjects}</p>}
          <div className="tm-projects">
            {projects.map((p) => {
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <Link className="tm-project" to={`/team/projects/${p.id}`} key={p.id}>
                  <span className="tm-project-name" dir="auto">{p.name}</span>
                  {p.summary && <span className="tm-muted tm-project-summary" dir="auto">{p.summary}</span>}
                  <span className="tm-bar"><span style={{ width: `${pct}%` }} /></span>
                  <span className="tm-muted tm-small">{t.progress(p.done, p.total)} · {pct}%</span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      {open && <TeamTaskModal task={open} projectName={open.project?.name} onClose={() => setOpen(null)} onChange={replaceTask} />}
    </>
  );
}
