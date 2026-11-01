// Skills.jsx — the "Tools I use" section (id="skills"), in two parts:
//   1. the core stack: a band in the hero's panel colours where each core tool sits on a round pad
//      and one trace runs through all the pads, like the strokes of the brand mark (BrandMark.jsx);
//   2. the full toolkit: one block per group (languages, frontend, backend, mobile, desktop,
//      databases, tools — lib/skillGroups.js), core tools first and marked, "when needed" ones last,
//      dimmed. Empty groups are left out.
// Under both, a strip lists technologies the projects used that are not on the skills list yet.
//
// Skills come live from GET /skills and are managed on the dashboard's Skills page; tierOf() in
// lib/skillGroups.js reads a skill's tier. Each tool also shows how many projects
// (GET /projects) list it in their tags. Logos (lib/toolIcons.js) load as a separate chunk.
import { useEffect, useState } from "react";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";
import { GROUPS, groupOf, tierOf } from "../lib/skillGroups";

// "Node.js" → "nodejs", "React 18" → "react18", "C++" → "c++"
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9#+]/g, "");

// a project tag names a skill when it is that name, or that name plus a version ("react18")
const tagMatches = (tag, name) => tag === name || (tag.startsWith(name) && /^\d/.test(tag.slice(name.length)));

// "Git / GitHub" can be written as either name in a project's tags
const names = (skill) => String(skill.name).split("/").map(norm).filter(Boolean);

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
  const [kitRef, kitVisible] = useReveal();

  useEffect(() => {
    import("../lib/toolIcons").then((m) => setIconFor(() => m.iconFor)).catch(() => setIconFor(() => () => null));
  }, []);

  const projectTags = projects.map((p) => splitTags(p.tags).map(norm));
  const usedIn = (skill) => projectTags.filter((tags) => tags.some((tag) => names(skill).some((n) => tagMatches(tag, n)))).length;
  const note = (skill) => (lang === "ar" ? skill.noteAr || skill.noteEn : skill.noteEn || skill.noteAr);

  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
  const rank = { core: 0, regular: 1, working: 2 };
  const core = skills.filter((s) => tierOf(s) === "core").sort((a, b) => GROUPS.indexOf(groupOf(a)) - GROUPS.indexOf(groupOf(b)) || byOrder(a, b));
  const kit = GROUPS.map((group) => ({
    group,
    list: skills.filter((s) => groupOf(s) === group).sort((a, b) => rank[tierOf(a)] - rank[tierOf(b)] || byOrder(a, b)),
  })).filter((g) => g.list.length);

  // technologies the projects used that no skill covers, in first-seen order
  const extra = [];
  for (const tag of projects.flatMap((p) => splitTags(p.tags))) {
    const n = norm(tag);
    if (skills.some((s) => names(s).some((name) => tagMatches(n, name)))) continue;
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
                      <strong><bdi>{skill.name}</bdi></strong>
                      {note(skill) && <span className="core-note">{note(skill)}</span>}
                      <span className="core-meta">
                        {t.skills.groups[groupOf(skill)]}
                        {count > 0 && <> · {projectsLabel(count, lang)}</>}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {kit.length > 0 && (
          <div ref={kitRef} className={`kit ${kitVisible ? "visible" : ""}`} data-ao>
            <h3 className="kit-title">{t.skills.kitLabel}</h3>
            <div className="kit-cols">
              {kit.map(({ group, list }) => (
                <div className="kit-col" key={group}>
                  <h4>{t.skills.groups[group]} <span>{list.length}</span></h4>
                  <ul>
                    {list.map((skill) => {
                      const count = usedIn(skill);
                      const tier = tierOf(skill);
                      return (
                        <li className={`kit-tool is-${tier}`} key={skill.id}>
                          <Logo skill={skill} iconFor={iconFor} />
                          <span className="kit-name">
                            <bdi>{skill.name}</bdi>
                            {note(skill) && <small>{note(skill)}</small>}
                          </span>
                          <span className="kit-meta">
                            {tier !== "regular" && <span className="kit-tier">{t.skills.tiers[tier]}</span>}
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
