// TeamProject.jsx — one project in the member portal (/#/team/projects/:id), in three tabs:
//   Board — every task of the project by status (the member's own cards are highlighted;
//           clicking any card opens it, a teammate's read-only),
//   Docs  — the project's Markdown documentation + its links,
//   Team  — who is on the project and their specialty.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { initials, formatDue } from "../../lib/team";
import Board from "../../components/team/Board";
import MarkdownView from "../../components/team/MarkdownView";
import { TeamTopbar, useTeam } from "./TeamPortal";
import TeamTaskModal from "./TeamTaskModal";

export default function TeamProject() {
  const { id } = useParams();
  const { t, lang, member } = useTeam();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("board");
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/team/projects/${id}`).then(setData).catch((err) => setError(err.message));
  }, [id]);

  const replaceTask = (updated) => {
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === updated.id ? updated : x)) }));
    setOpen(updated);
  };

  if (!data) {
    return (<><TeamTopbar /><main className="tm-page"><Link className="tm-back" to="/team">{t.back}</Link><p className={error ? "tm-error" : "tm-muted"}>{error || t.loading}</p></main></>);
  }
  const { project, tasks } = data;
  const done = tasks.filter((x) => x.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <>
      <TeamTopbar />
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

        {tab === "board" && <Board tasks={tasks} lang={lang} onOpen={setOpen} mine={member.id} />}

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
      {open && <TeamTaskModal task={open} projectName={project.name} onClose={() => setOpen(null)} onChange={replaceTask} />}
    </>
  );
}
