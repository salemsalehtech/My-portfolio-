// TeamProject.jsx — one project in the member portal (/#/team/projects/:id), in three tabs:
//   Board — every task of the project by status (the member's own cards are highlighted;
//           clicking any card opens it, a teammate's read-only). The member drags their own
//           cards between the columns they may use (todo ↔ doing → review, see MEMBER_MOVES);
//           search and filters sit above the board,
//   Docs  — the project's Markdown documentation + its links,
//   Team  — who is on the project and their specialty.
// ?task=<id> in the address (a link from the bell 🔔) opens that task.
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { initials, formatDue, MEMBER_MOVES, SHARED_COPY } from "../../lib/team";
import Board from "../../components/team/Board";
import MarkdownView from "../../components/team/MarkdownView";
import { useTeam } from "./TeamPortal";
import TeamTaskModal from "./TeamTaskModal";

export default function TeamProject() {
  const { id } = useParams();
  const { t, lang, member } = useTeam();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("board");
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");
  const [params, setParams] = useSearchParams();
  const taskParam = params.get("task");

  useEffect(() => {
    api.get(`/team/projects/${id}`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (data && taskParam) { const found = data.tasks.find((x) => x.id === taskParam); if (found) { setOpen(found); setTab("board"); } }
  }, [data, taskParam]);
  const close = () => { setOpen(null); if (taskParam) setParams({}, { replace: true }); };

  const patchTask = (taskId, patch) => setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === taskId ? { ...x, ...patch } : x)) }));
  const replaceTask = (updated) => {
    patchTask(updated.id, updated);
    setOpen((cur) => ({ ...cur, ...updated }));
  };

  // Drag & drop: only my own cards, only the moves a member may make. The card moves at once
  // and goes back if the server says no.
  const canMove = (task, status) => task.assignee?.id === member.id && MEMBER_MOVES[task.status].includes(status);
  const onMove = async (task, status) => {
    setError("");
    patchTask(task.id, { status });
    try {
      patchTask(task.id, await api.patch(`/team/tasks/${task.id}/status`, { status }));
    } catch (err) {
      patchTask(task.id, { status: task.status });
      setError(err.message || SHARED_COPY[lang].moveFailed);
    }
  };

  if (!data) {
    return (<main className="tm-page"><Link className="tm-back" to="/team">{t.back}</Link><p className={error ? "tm-error" : "tm-muted"}>{error || t.loading}</p></main>);
  }
  const { project, tasks } = data;
  const done = tasks.filter((x) => x.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <>
      <main className="tm-page tm-page-wide">
        <Link className="tm-back" to="/team">{t.back}</Link>
        <header className="tm-project-head">
          <div>
            <h1 dir="auto">{project.name}</h1>
            {project.summary && <p className="tm-muted" dir="auto">{project.summary}</p>}
          </div>
          <div className="tm-project-progress">
            <span className="tm-bar"><span style={{ width: `${pct}%` }} /></span>
            <span className="tm-muted tm-small">{t.progress(done, tasks.length)} · {pct}%{project.dueDate ? ` · ${t.due}: ${formatDue(project.dueDate, lang)}` : ""}</span>
          </div>
        </header>

        <nav className="tm-tabs" role="tablist">
          {["board", "docs", "team"].map((key) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{t[key]}</button>
          ))}
        </nav>

        {tab === "board" && error && <p className="tm-error" role="alert">{error}</p>}
        {tab === "board" && <Board tasks={tasks} lang={lang} onOpen={setOpen} mine={member.id} members={project.members} canMove={canMove} onMove={onMove} />}

        {tab === "docs" && (
          <div className="tm-docs">
            {project.links.length > 0 && (
              <div className="tm-links">
                <strong>{t.links}</strong>
                {project.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">{l.label || l.url} ↗</a>)}
              </div>
            )}
            <MarkdownView text={project.docs} empty={t.noDocs} />
          </div>
        )}

        {tab === "team" && (
          <ul className="tm-people">
            {project.members.map((m) => (
              <li key={m.id}>
                <span className="tm-avatar tm-avatar-lg">{initials(m.name)}</span>
                <span><strong>{m.name}</strong><span className="tm-muted tm-small">{m.specialty}</span></span>
              </li>
            ))}
          </ul>
        )}
      </main>
      {open && <TeamTaskModal task={open} projectName={project.name} onClose={close} onChange={replaceTask} onCommentCount={(n) => patchTask(open.id, { commentCount: n })} />}
    </>
  );
}
