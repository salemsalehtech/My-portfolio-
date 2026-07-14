import { useSite } from "../context/SiteContext";

export default function ProjectModal({ project, onClose }) {
  const { t, lang } = useSite();
  if (!project) return null;

  const title = lang === "ar" ? project.titleAr : project.titleEn;
  const desc = lang === "ar" ? project.descAr : project.descEn;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ background: project.gradient }}>
          <button className="modal-close" onClick={onClose}>✕</button>
          <div className="modal-tags">
            {project.tags.map((tag) => (
              <span className="modal-tag" key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <div className="modal-body">
          <h2>{title}</h2>
          <p>{desc}</p>
          <div className="modal-actions">
            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="btn-modal-demo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              {t.projects.liveDemo}
            </a>
            <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-modal-code">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.7.8.58A12 12 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              {t.projects.viewCode}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
