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
import { norm, tagMatches, skillNames, splitTags } from "../lib/skillMatch";
import { scrollToSection } from "../lib/scrollToSection";

const names = skillNames;

// "2 projects" next to a tool: shows only those projects in the Projects section (Projects.jsx listens).
const showProjects = (skill) => {
  window.dispatchEvent(new CustomEvent("filter-projects", { detail: { label: skill.name, names: names(skill) } }));
  scrollToSection("projects");
};
const readArea = () => { try { return localStorage.getItem("skillsArea") || ""; } catch { return ""; } };

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
      <path d={icon.path} fillRule={icon.rule} />
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
  const [area, setArea] = useState(readArea); // the area shown in "everything I work with"

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

  // the chosen area, or the first one that has tools (also when the saved one is gone)
  const activeArea = kit.some((g) => g.group === area) ? area : kit[0]?.group;
  const chooseArea = (group) => { setArea(group); try { localStorage.setItem("skillsArea", group); } catch { /* storage blocked */ } };
  // arrow keys move between the tabs (and wrap), as in any tab list
  const onTabKey = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const rtl = lang === "ar" && Math.abs(step) === 1 ? -1 : 1;
    const i = kit.findIndex((g) => g.group === activeArea);
    const next = step === -Infinity ? 0 : step === Infinity ? kit.length - 1 : (i + step * rtl + kit.length) % kit.length;
    chooseArea(kit[next].group);
    document.getElementById(`skills-tab-${kit[next].group}`)?.focus();
  };
  const current = kit.find((g) => g.group === activeArea);

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
            <div className="kit-tabs" role="tablist" aria-label={t.skills.kitLabel} onKeyDown={onTabKey}>
              {kit.map(({ group, list }) => (
                <button key={group} id={`skills-tab-${group}`} type="button" role="tab" className="kit-tab"
                  aria-selected={group === activeArea} aria-controls="skills-panel" tabIndex={group === activeArea ? 0 : -1}
                  onClick={() => chooseArea(group)}>
                  {t.skills.groups[group]} <span>{list.length}</span>
                </button>
              ))}
            </div>
            {current && (
              <div className="kit-panel" id="skills-panel" role="tabpanel" aria-labelledby={`skills-tab-${current.group}`} key={current.group}>
                  <ul className="kit-grid">
                    {current.list.map((skill) => {
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
                            {count > 0 && <button type="button" className="kit-projects" onClick={() => showProjects(skill)}>{projectsLabel(count, lang)}</button>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
              </div>
            )}
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
