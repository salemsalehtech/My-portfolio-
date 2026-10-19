// Projects.jsx — the "Featured Projects" section (id="projects"): a technology filter bar
// plus a grid of project cards, fetched live from the public GET /projects API via
// useCollection(). Clicking a card opens ProjectModal with that project's full details.
//
// The filter buttons are NOT a fixed list: they are built from the `tags` of the projects
// themselves (edited in Admin → Projects), most-used first. Add a tag to a project in the
// dashboard and a button for it appears here — nothing to change in the code.
import { useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";
import ProjectModal from "./ProjectModal";

// "React", "react " and "REACT" count as the same tag.
const tagKey = (tag) => String(tag).trim().toLowerCase();

// Unique tags across all projects as [{ key, label, count }], most used first (then A→Z).
function collectTags(projects) {
  const found = new Map();
  for (const project of projects) {
    const seenInThisProject = new Set(); // a tag listed twice on one project counts once
    for (const raw of project.tags || []) {
      const key = tagKey(raw);
      if (!key || seenInThisProject.has(key)) continue;
      seenInThisProject.add(key);
      const entry = found.get(key);
      if (entry) entry.count += 1;
      else found.set(key, { key, label: String(raw).trim(), count: 1 });
    }
  }
  return [...found.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export default function Projects() {
  const { t, lang } = useSite();
  const { data: projects } = useCollection("/projects");
  const [filter, setFilter] = useState("all"); // "all" or a tag key
  const [selected, setSelected] = useState(null);
  const [headerRef, headerVisible] = useReveal();
  const [filterRef, filterVisible] = useReveal();
  const [gridRef, gridVisible] = useReveal();

  const tags = collectTags(projects);
  // If the selected tag no longer exists (data changed), fall back to showing everything.
  const activeFilter = tags.some((tag) => tag.key === filter) ? filter : "all";
  const filtered = activeFilter === "all"
    ? projects
    : projects.filter((p) => (p.tags || []).some((tag) => tagKey(tag) === activeFilter));

  return (
    <section id="projects" className="section-surface">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.projects.subtitle}</div>
          <h2>{t.projects.title}</h2>
          <div className="section-line"></div>
        </div>

        <div ref={filterRef} className={`filter-btns ${filterVisible ? "visible" : ""}`} data-ao>
          {tags.length > 0 && (
            <button className={`filter-btn ${activeFilter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              {t.projects.filterAll}
            </button>
          )}
          {tags.map((tag) => (
            <button key={tag.key} className={`filter-btn ${activeFilter === tag.key ? "active" : ""}`} onClick={() => setFilter(tag.key)}>
              {tag.label}
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
