// projects.js — small helpers shared by the project cards (components/Projects.jsx), the
// case-study page (pages/ProjectPage.jsx), the reviews and the dashboard.
import { API_BASE } from "./api";

// The project's picture (Admin → Projects → Upload picture). `?v=<updatedAt>` changes when a new
// picture is uploaded, so browsers never keep showing an old one.
export const projectImageUrl = (project) =>
  `${API_BASE}/projects/${project.id}/image?v=${encodeURIComponent(project.updatedAt || "")}`;

// The case-study page: /#/work/<slug>. Projects saved before they had a link name open by their id.
export const projectPath = (project) => `/work/${project.slug || project.id}`;
