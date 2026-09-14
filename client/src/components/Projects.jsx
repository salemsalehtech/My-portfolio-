// Projects.jsx — the "Featured Projects" section (id="projects"): a category filter bar
// plus a grid of project cards, fetched live from the public GET /projects API via
// useCollection(). Clicking a card opens ProjectModal with that project's full details.
import { useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";
import ProjectModal from "./ProjectModal";

const FILTERS = ["all", "web", "youtube", "automation"];

export default function Projects() {
  const { t, lang } = useSite();
  const { data: projects } = useCollection("/projects");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [gridRef, gridVisible] = useReveal();

  const filtered = filter === "all" ? projects : projects.filter((p) => p.category === filter);

  const filterLabel = { all: t.projects.filterAll, web: t.projects.filterWeb, youtube: t.projects.filterYoutube, automation: t.projects.filterAuto };

  return (
    <section id="projects" className="section-surface">
      <div className="container">
        <div className="section-header" data-ao>
          <div className="section-badge">{t.projects.subtitle}</div>
          <h2>{t.projects.title}</h2>
          <div className="section-line"></div>
        </div>

        <div className="filter-btns" data-ao>
          {FILTERS.map((f) => (
            <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {filterLabel[f]}
            </button>
          ))}
        </div>

        <div ref={gridRef} className={`projects-grid ${gridVisible ? "visible" : ""}`} data-ao>
          {filtered.map((project) => {
            const title = lang === "ar" ? project.titleAr : project.titleEn;
            const desc = lang === "ar" ? project.descAr : project.descEn;
            const cat = lang === "ar" ? project.catLabelAr : project.catLabelEn;
            return (
              <div className="project-card" key={project.id} onClick={() => setSelected(project)}>
                <div className="project-thumb" style={{ background: project.gradient }}>
                  <div className="project-tags">
                    {project.tags.map((tag) => (
                      <span className="project-tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="project-body">
                  <h3 className="project-title">{title}</h3>
                  <p className="project-desc">{desc}</p>
                  <div className="project-footer">
                    <span className="project-cat">{cat}</span>
                    <span className="project-more">Details →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && <ProjectModal project={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
