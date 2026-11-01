// skillGroups.js — what the Skills section (components/Skills.jsx) and the dashboard's Skills page
// (pages/admin/AdminSkills.jsx) agree on: the groups a skill can belong to, in display order, and
// how to read a skill's tier.
//
// A skill's `group` is free text in the database; one that is not listed here is shown under
// "tools" so nothing disappears. Labels live in i18n/translations.js (skills.groups) and, for the
// dashboard, in i18n/adminAr.js.
export const GROUPS = ["languages", "frontend", "backend", "mobile", "desktop", "databases", "tools"];

export const groupOf = (skill) => (GROUPS.includes(skill.group) ? skill.group : "tools");

// core / regular / working. Skills saved before tiers existed are placed by their English level
// (Expert → core, Advanced → regular, anything else → working), then by their old percentage.
export function tierOf(skill) {
  if (skill.tier) return skill.tier;
  const level = String(skill.levelEn || "").toLowerCase().trim();
  if (level === "expert") return "core";
  if (level === "advanced") return "regular";
  if (level) return "working";
  return skill.percentage >= 90 ? "core" : skill.percentage >= 80 ? "regular" : "working";
}
