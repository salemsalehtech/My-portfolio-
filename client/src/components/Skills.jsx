// Skills.jsx — the "Tools I use" section (id="skills"), in two parts:
//   1. the core stack: a band in the hero's panel colours where each core tool sits on a round pad
//      and one trace runs through all the pads, like the strokes of the brand mark (BrandMark.jsx);
//   2. the rest of the toolkit: one column per group (frontend / backend / tools), regular tools
//      first, "when needed" ones after them, dimmed.
// Under both, a strip lists technologies the projects used that are not on the skills list yet.
//
// Skills come live from GET /skills and are managed on the dashboard's Skills page. A skill's row is
// its `tier`; old skills without one are placed by their English level (Expert → core,
// Advanced → regular, anything else → working). Each tool also shows how many projects
// (GET /projects) list it in their tags. Logos (lib/toolIcons.js) load as a separate chunk.
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";

const GROUPS = ["frontend", "backend", "tools"];

// "Node.js" → "nodejs", "React 18" → "react18"
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9#]/g, "");

// "Git / GitHub" can be written as either name in a project's tags
const names = (skill) => String(skill.name).split("/").map(norm).filter(Boolean);

function tierOf(skill) {
  if (skill.tier) return skill.tier;
  const level = norm(skill.levelEn);
  if (level === "expert") return "core";
  if (level === "advanced") return "regular";
  if (level) return "working";
  return skill.percentage >= 90 ? "core" : skill.percentage >= 80 ? "regular" : "working";
}

// a project's tags can bundle several tools: "Node.js + Express.js"
const splitTags = (tags) => (tags || []).flatMap((t) => String(t).split("+")).map((t) => t.trim()).filter(Boolean);

function projectsLabel(n, lang) {
  if (lang !== "ar") return n === 1 ? "1 project" : `${n} projects`;
  if (n === 1) return "مشروع واحد";
  if (n === 2) return "مشروعين";
  return n <= 10 ? `${n} مشاريع` : `${n} مشروع`;
}

function Logo({ skill, iconFor }) {
  const icon = iconFor?.(skill);
  if (!iconFor) return <span className="tool-logo" aria-hidden="true" />; // logos still loading
  if (!icon) return <span className="tool-abbr" aria-hidden="true">{skill.abbr || skill.name.slice(0, 2)}</span>;
  return (
    <svg className="tool-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={icon.path} />
    </svg>
  );
}

export default function Skills() {
  const { t, lang } = useSite();
  const { data: skills } = useCollection("/skills");
  const { data: projects } = useCollection("/projects");
  const [iconFor, setIconFor] = useState(null);
  const [headerRef, headerVisible] = useReveal();
  const [coreRef, coreVisible] = useReveal();
  const [restRef, restVisible] = useReveal();

  useEffect(() => {
    import("../lib/toolIcons").then((m) => setIconFor(() => m.iconFor)).catch(() => setIconFor(() => () => null));
  }, []);

  const projectTags = projects.map((p) => splitTags(p.tags).map(norm));
  const usedIn = (skill) => projectTags.filter((tags) => tags.some((tag) => names(skill).some((n) => tag.startsWith(n)))).length;
  const note = (skill) => (lang === "ar" ? skill.noteAr || skill.noteEn : skill.noteEn || skill.noteAr);

  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
  const core = skills.filter((s) => tierOf(s) === "core").sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || byOrder(a, b));
  const rest = GROUPS.map((group) => ({
    group,
    list: skills
      .filter((s) => s.group === group && tierOf(s) !== "core")
      .sort((a, b) => (tierOf(a) === "working") - (tierOf(b) === "working") || byOrder(a, b)),
  })).filter((g) => g.list.length);

  // technologies the projects used that no skill covers, in first-seen order
  const extra = [];
  for (const tag of projects.flatMap((p) => splitTags(p.tags))) {
    const n = norm(tag);
    if (skills.some((s) => names(s).some((name) => n.startsWith(name)))) continue;
    if (!extra.some((e) => norm(e) === n)) extra.push(tag);
  }

  return (
    <section id="skills" className="section-bg">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.skills.subtitle}</div>
          <h2>{t.skills.title}</h2>
          <div className="section-line"></div>
        </div>

        {core.length > 0 && (
          <div ref={coreRef} className={`core-band ${coreVisible ? "visible" : ""}`} data-ao>
            <p className="core-label">{t.skills.coreLabel}</p>
            <ul className="core-list">
              {core.map((skill, i) => {
                const count = usedIn(skill);
                return (
                  <li className="core-tool" key={skill.id} style={{ "--i": i }}>
                    <span className="core-pad"><Logo skill={skill} iconFor={iconFor} /></span>
                    <span className="core-text">
                      <strong>{skill.name}</strong>
                      {note(skill) && <span className="core-note">{note(skill)}</span>}
                      <span className="core-meta">
                        {t.skills[skill.group]}
                        {count > 0 && <> · {projectsLabel(count, lang)}</>}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {rest.length > 0 && (
          <div ref={restRef} className={`kit ${restVisible ? "visible" : ""}`} data-ao>
            <h3 className="kit-title">{t.skills.restLabel}</h3>
            <div className="kit-cols">
              {rest.map(({ group, list }) => (
                <div className="kit-col" key={group}>
                  <h4>{t.skills[group]}</h4>
                  <ul>
                    {list.map((skill) => {
                      const count = usedIn(skill);
                      const tier = tierOf(skill);
                      return (
                        <li className={`kit-tool is-${tier}`} key={skill.id}>
                          <Logo skill={skill} iconFor={iconFor} />
                          <span className="kit-name">
                            {skill.name}
                            {note(skill) && <small>{note(skill)}</small>}
                          </span>
                          <span className="kit-meta">
                            {tier === "working" && <span>{t.skills.tiers.working}</span>}
                            {count > 0 && <span>{projectsLabel(count, lang)}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {extra.length > 0 && (
          <p className="stack-extra">
            <span>{t.skills.alsoShipped}</span>
            {extra.map((tag) => <code key={tag}>{tag}</code>)}
          </p>
        )}
      </div>
    </section>
  );
}
