// TeamProjects.jsx — the "Projects" tab (/#/team/projects): the projects I belong to, as cards
// with their progress and due date. A card opens the project (board, docs, team).
import { Link } from "react-router-dom";
import { today, formatDue } from "../../lib/team";
import { FolderIcon } from "../../components/team/icons";
import BrandLoader from "../../components/BrandLoader";
import { useTeam } from "./TeamPortal";
import { useWork } from "./WorkContext";

export default function TeamProjects() {
  const { t, lang } = useTeam();
  const { projects, loading, error } = useWork();
  return (
    <main className="tm-page tm-page-wide">
      <header className="tm-pagehead"><h1>{t.myProjects}</h1></header>
      {error && <p className="tm-error">{error}</p>}
      {loading ? <BrandLoader label={t.loading} /> : (
        <>
          {projects.length === 0 && <p className="tm-empty">{t.noProjects}</p>}
          <div className="tm-projects">
            {projects.map((p) => {
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <Link className="tm-project" to={`/team/projects/${p.id}`} key={p.id}>
                  <span className="tm-project-top">
                    <span className="cut-icon is-sm"><FolderIcon size={18} /></span>
                    <span className="tm-project-pct">{pct}%</span>
                  </span>
                  <span className="tm-project-name" dir="auto">{p.name}</span>
                  {p.summary && <span className="tm-muted tm-project-summary" dir="auto">{p.summary}</span>}
                  <span className="tm-bar"><span style={{ width: `${pct}%` }} /></span>
                  <span className="tm-project-foot">
                    <span className="tm-muted tm-small">{t.progress(p.done, p.total)}</span>
                    {p.dueDate && <span className={`tm-small ${p.dueDate < today() ? "tm-late" : "tm-muted"}`}>{formatDue(p.dueDate, lang)}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
