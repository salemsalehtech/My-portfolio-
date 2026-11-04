// ProjectPage.jsx — one project's case study (route /work/:slug). Loaded on demand (React.lazy in
// App.jsx) together with the Markdown libraries, like an article.
//
// It fetches GET /projects/:slug (the project + the visible reviews about it) and lays out, top to
// bottom: the title and summary, the facts (role, year, stack, links), the picture, the results in
// numbers, the problem → solution → result trace, the longer story (Markdown, optional), the
// client's review, the "start a project like this" band and the next / previous project.
// Everything is edited in Admin → Projects; an empty part is simply not shown.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSite } from "../context/SiteContext";
import { api } from "../lib/api";
import { pick } from "../lib/pick";
import { renderMarkdown } from "../lib/markdown";
import { projectImageUrl, projectPath } from "../lib/projects";
import { track } from "../lib/analytics";
import { GithubIcon } from "../lib/socialIcons";
import { useCollection } from "../hooks/useCollection";
import { useSiteSettings } from "../hooks/useSiteSettings";
import BlogHeader from "../components/BlogHeader";
import CtaBand from "../components/CtaBand";
import WhatsAppButton from "../components/WhatsAppButton";
import { TestimonialCard } from "../components/Testimonials";
import { ArrowIcon } from "../components/ArrowIcon";

const isLink = (url) => /^https?:\/\/\S+$/i.test(url || "");

export default function ProjectPage() {
  const { slug } = useParams();
  const { t, lang } = useSite();
  const settings = useSiteSettings();
  const { data: all } = useCollection("/projects");
  const [project, setProject] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    window.scrollTo(0, 0);
    setProject(undefined);
    api.get(`/projects/${encodeURIComponent(slug)}`)
      .then((data) => { setProject(data); track("project", data.id); })
      .catch(() => setProject(null));
  }, [slug]);

  const title = project ? pick(lang, project.titleEn, project.titleAr) : "";
  useEffect(() => {
    if (title) document.title = `${title} | Salem Saleh`;
  }, [title]);

  const w = t.work;
  if (project === undefined || project === null) {
    return (
      <div className="blog-page">
        <BlogHeader />
        <main className="container blog-main">
          {project === undefined ? <p className="blog-empty">…</p> : (
            <div className="blog-empty">
              <p>{w.notFound}</p>
              <Link to="/" state={{ scrollTo: "projects" }} className="btn-secondary">{w.back}</Link>
            </div>
          )}
        </main>
      </div>
    );
  }

  const steps = [
    { key: "problem", label: t.projects.problem, text: pick(lang, project.problemEn, project.problemAr) },
    { key: "solution", label: t.projects.solution, text: pick(lang, project.solutionEn, project.solutionAr) },
    { key: "result", label: t.projects.result, text: pick(lang, project.resultEn, project.resultAr) },
  ].filter((step) => step.text);
  // The story in the page's language, or the other one when only that exists (then it reads in its own direction).
  const storyIsAr = lang === "ar" ? Boolean(project.storyAr) : !project.storyEn && Boolean(project.storyAr);
  const story = storyIsAr ? project.storyAr : project.storyEn;
  const role = pick(lang, project.roleEn, project.roleAr);
  const category = pick(lang, project.catLabelEn, project.catLabelAr);
  const hasDemo = isLink(project.demoUrl);
  const hasCode = isLink(project.githubUrl);

  // Next / previous in the order of the Projects section (with two projects, only "next").
  const index = all.findIndex((p) => p.id === project.id);
  const prev = all.length > 2 && index >= 0 ? all[(index - 1 + all.length) % all.length] : null;
  const next = all.length > 1 && index >= 0 ? all[(index + 1) % all.length] : null;

  return (
    <div className="blog-page">
      <BlogHeader />
      <main className="cs-main">
        <header className="container cs-head">
          <Link to="/" state={{ scrollTo: "projects" }} className="post-back">{lang === "ar" ? "→" : "←"} {w.back}</Link>
          {(category || project.year) && (
            <p className="cs-eyebrow">{[category, project.year].filter(Boolean).join(" · ")}</p>
          )}
          <h1 className="cs-title">{title}</h1>
          <p className="cs-lead" dir="auto">{pick(lang, project.descEn, project.descAr)}</p>

          <dl className="cs-facts">
            {role && <div><dt>{w.role}</dt><dd>{role}</dd></div>}
            {project.year && <div><dt>{w.year}</dt><dd><bdi>{project.year}</bdi></dd></div>}
            {project.tags.length > 0 && (
              <div className="cs-stack"><dt>{w.stack}</dt><dd>{project.tags.map((tag) => <code key={tag}>{tag}</code>)}</dd></div>
            )}
            {(hasDemo || hasCode) && (
              <div className="cs-links">
                <dt>{w.links}</dt>
                <dd>
                  {hasDemo && <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">{t.projects.liveDemo} <ArrowIcon size={14} /></a>}
                  {hasCode && <a href={project.githubUrl} target="_blank" rel="noopener noreferrer"><GithubIcon size={14} /> {t.projects.viewCode}</a>}
                </dd>
              </div>
            )}
          </dl>
        </header>

        <div className="container">
          {project.hasImage && (
            <figure className="cs-cover" style={{ background: project.gradient }}>
              <img src={projectImageUrl(project)} alt={title} />
            </figure>
          )}

          {project.metrics?.length > 0 && (
            <section className="cs-section" aria-labelledby="cs-results">
              <h2 className="cs-label" id="cs-results">{t.projects.results}</h2>
              <dl className="cs-metrics">
                {project.metrics.map((m, i) => (
                  <div key={i}><dt><bdi>{m.value}</bdi></dt><dd>{pick(lang, m.labelEn, m.labelAr)}</dd></div>
                ))}
              </dl>
            </section>
          )}

          {steps.length > 0 && (
            <section className="cs-section" aria-labelledby="cs-case">
              <h2 className="cs-label" id="cs-case">{t.projects.caseStudy}</h2>
              <ol className="cs-trace" style={{ "--stops": steps.length }}>
                {steps.map((step) => (
                  <li key={step.key} className={`cs-stop is-${step.key}`}>
                    <span className="cs-pad" aria-hidden="true" />
                    <h3>{step.label}</h3>
                    <p dir="auto">{step.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {story && (
            <section className="cs-section cs-story" aria-labelledby="cs-story">
              <h2 className="cs-label" id="cs-story">{w.story}</h2>
              {/* Safe: renderMarkdown sanitizes the HTML with DOMPurify before it reaches the page. */}
              <div className="prose" dir={storyIsAr ? "rtl" : "ltr"} lang={storyIsAr ? "ar" : "en"}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(story) }} />
            </section>
          )}

          {project.testimonials?.length > 0 && (
            <section className="cs-section" aria-labelledby="cs-review">
              <h2 className="cs-label" id="cs-review">{w.review}</h2>
              <div className="cs-reviews">
                {project.testimonials.map((item) => <TestimonialCard key={item.id} item={{ ...item, project: null }} />)}
              </div>
            </section>
          )}
        </div>

        <CtaBand settings={settings} title={w.ctaTitle} prefill={w.similar.replace("{title}", title)}
          whatsappText={w.similar.replace("{title}", title)} />

        {next && (
          <nav className="container cs-nav" aria-label={w.more}>
            {prev && (
              <Link to={projectPath(prev)} className="cs-nav-link is-prev">
                <span>{w.prev}</span><strong>{pick(lang, prev.titleEn, prev.titleAr)}</strong>
              </Link>
            )}
            <Link to={projectPath(next)} className="cs-nav-link is-next">
              <span>{w.next}</span><strong>{pick(lang, next.titleEn, next.titleAr)}</strong>
            </Link>
          </nav>
        )}
      </main>
      <WhatsAppButton number={settings.whatsapp} text={w.similar.replace("{title}", title)} />
    </div>
  );
}
