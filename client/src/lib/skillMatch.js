// skillMatch.js — which projects used a skill, read from the projects' tags. Shared by the Skills
// section (the "2 projects" counts) and the Projects section (showing only those projects).

// "Node.js" → "nodejs", "React 18" → "react18", "C++" → "c++"
export const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9#+]/g, "");

// a project tag names a skill when it is that name, or that name plus a version ("react18")
export const tagMatches = (tag, name) => tag === name || (tag.startsWith(name) && /^\d/.test(tag.slice(name.length)));

// "Git / GitHub" can be written as either name in a project's tags
export const skillNames = (skill) => String(skill.name).split("/").map(norm).filter(Boolean);

// a project's tags can bundle several tools: "Node.js + Express.js"
export const splitTags = (tags) => (tags || []).flatMap((t) => String(t).split("+")).map((t) => t.trim()).filter(Boolean);

// true when one of the project's tags names one of `names` (normalized skill names)
export const projectUses = (project, names) => splitTags(project.tags).map(norm).some((tag) => names.some((n) => tagMatches(tag, n)));
