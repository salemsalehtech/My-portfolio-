// ProjectModal.jsx — popup dialog showing full details of one project. Rendered by
// components/Projects.jsx when a project card is clicked.
//
// Props:
//   - project  the selected project object (from the /projects API — see
//              server/src/lib/mongo.js for its shape), or null/undefined to render nothing
//   - onClose  called when the user closes the modal (backdrop click or the ✕ button)
//
// Each project stores both English and Arabic texts on the same object (titleEn/titleAr,
// descEn/descAr, …) — pick() chooses the current language, falling back to the other one.
//
// Case study: if the project has a problem / solution / result (Admin → Projects), they are
// shown as three steps under the description. The "Live Demo" / "Source Code" buttons only
// appear when the project has a real http(s) link for them.
import { useSite } from "../context/SiteContext";
import { pick } from "../lib/pick";
import { GithubIcon } from "../lib/socialIcons";
import { projectImageUrl } from "./Projects";

const isLink = (url) => /^https?:\/\/\S+$/i.test(url || "");

export default function ProjectModal({ project, onClose }) {
  const { t, lang } = useSite();
  if (!project) return null;

  const title = pick(lang, project.titleEn, project.titleAr);
  const desc = pick(lang, project.descEn, project.descAr);
  const steps = [
    { key: "problem", label: t.projects.problem, text: pick(lang, project.problemEn, project.problemAr) },
    { key: "solution", label: t.projects.solution, text: pick(lang, project.solutionEn, project.solutionAr) },
    { key: "result", label: t.projects.result, text: pick(lang, project.resultEn, project.resultAr) },
  ].filter((step) => step.text);
  const hasDemo = isLink(project.demoUrl);
  const hasCode = isLink(project.githubUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header ${project.hasImage ? "has-image" : ""}`} style={{ background: project.gradient }}>
          {project.hasImage && <img className="modal-header-img" src={projectImageUrl(project)} alt="" />}
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

          {steps.length > 0 && (
            <div className="case-study">
              <div className="case-study-title">{t.projects.caseStudy}</div>
              {steps.map((step, i) => (
                <div className={`case-step case-step-${step.key}`} key={step.key}>
                  <div className="case-step-num">{i + 1}</div>
                  <div>
                    <div className="case-step-label">{step.label}</div>
                    <p className="case-step-text" dir="auto">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(hasDemo || hasCode) && (
            <div className="modal-actions">
              {hasDemo && (
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="btn-modal-demo">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  {t.projects.liveDemo}
                </a>
              )}
              {hasCode && (
                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-modal-code">
                  <GithubIcon size={13} />
                  {t.projects.viewCode}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
