// Skills.jsx — the "Tools I use" section (id="skills"): a board with the three groups as columns
// (frontend / backend / tools) and three depth tiers as rows — no percentages. Skills come live
// from the public GET /skills API; each skill's tier is read from its English level
// (Expert → core, Advanced → regular, anything else → working; the old `percentage` is only a
// fallback when the level is empty).
//
// Each tool shows how many projects (GET /projects) list it in their tags, and the strip under the
// board lists technologies those projects used that are not on the skills list yet.
//
// On phones the board turns into one list per group, and every tool carries its tier as a label.
import { siCss3, siGit, siHtml5, siJavascript, siLaravel, siMysql, siNodedotjs, siPhp, siReact, siVuedotjs, siYoutube } from "simple-icons";
import { useSite } from "../context/SiteContext";
import { useReveal } from "../hooks/useReveal";
import { useCollection } from "../hooks/useCollection";

const GROUPS = ["frontend", "backend", "tools"];
const TIERS = ["core", "regular", "working"];

// "Node.js" → "nodejs", "React 18" → "react18"
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9#]/g, "");

const ICONS = {
  html5: siHtml5, css3: siCss3, javascript: siJavascript, react: siReact, vuejs: siVuedotjs,
  php: siPhp, laravel: siLaravel, nodejs: siNodedotjs, mysql: siMysql, git: siGit, contentcreation: siYoutube,
};

// "Git / GitHub" can be written as either name in a project's tags
const names = (skill) => String(skill.name).split("/").map(norm).filter(Boolean);

function tierOf(skill) {
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

function Logo({ skill }) {
  const icon = ICONS[names(skill)[0]];
  if (!icon) return <span className="tool-abbr" aria-hidden="true">{skill.abbr || skill.name.slice(0, 2)}</span>;
  return (
    <svg className="tool-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ "--brand": `#${icon.hex}` }}>
      <path d={icon.path} />
    </svg>
  );
}

export default function Skills() {
  const { t, lang } = useSite();
  const { data: skills } = useCollection("/skills");
  const { data: projects } = useCollection("/projects");
  const [headerRef, headerVisible] = useReveal();
  const [boardRef, boardVisible] = useReveal();

  const projectTags = projects.map((p) => splitTags(p.tags).map(norm));
  const usedIn = (skill) => projectTags.filter((tags) => tags.some((tag) => names(skill).some((n) => tag.startsWith(n)))).length;

  // technologies the projects used that no skill covers, in first-seen order
  const extra = [];
  for (const tag of projects.flatMap((p) => splitTags(p.tags))) {
    const n = norm(tag);
    if (skills.some((s) => names(s).some((name) => n.startsWith(name)))) continue;
    if (!extra.some((e) => norm(e) === n)) extra.push(tag);
  }

  const cell = (group, tier) => skills.filter((s) => s.group === group && tierOf(s) === tier);
  let n = 0; // running index for the staggered reveal

  return (
    <section id="skills" className="section-bg">
      <div className="container">
        <div ref={headerRef} className={`section-header ${headerVisible ? "visible" : ""}`} data-ao>
          <div className="section-badge">{t.skills.subtitle}</div>
          <h2>{t.skills.title}</h2>
          <div className="section-line"></div>
        </div>

        <div ref={boardRef} className={`stack-board ${boardVisible ? "visible" : ""}`} data-ao>
          <div className="stack-col stack-tiers" aria-hidden="true">
            <div className="stack-head" />
            {TIERS.map((tier) => (
              <div className="stack-tier" key={tier}>
                <strong>{t.skills.tiers[tier]}</strong>
                <span>{t.skills.tierNotes[tier]}</span>
              </div>
            ))}
          </div>

          {GROUPS.map((group) => (
            <div className="stack-col" key={group}>
              <h3 className="stack-head">{t.skills[group]}</h3>
              {TIERS.map((tier) => {
                const list = cell(group, tier);
                return (
                  <ul className={`stack-cell ${list.length ? "" : "is-empty"}`} key={tier}>
                    {list.map((skill) => {
                      const count = usedIn(skill);
                      return (
                        <li className="tool" key={skill.id} style={{ "--i": n++ }}>
                          <Logo skill={skill} />
                          <span className="tool-name">{skill.name}</span>
                          <span className="tool-meta">
                            <span className={`tool-tier is-${tier}`}>{t.skills.tiers[tier]}</span>
                            {count > 0 && <span className="tool-count">{projectsLabel(count, lang)}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              })}
            </div>
          ))}
        </div>

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
