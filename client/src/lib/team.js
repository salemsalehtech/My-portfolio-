// team.js — shared helpers for the team workspace: the owner's pages (pages/admin/AdminTeam*.jsx)
// and the member portal (pages/team/). Statuses and priorities match the TeamTask model in
// server/src/lib/mongo.js.

export const STATUSES = ["todo", "doing", "review", "done"];
export const PRIORITIES = ["low", "normal", "high", "urgent"];

// Labels in both languages (the owner's dashboard uses the English ones).
export const STATUS_LABEL = {
  en: { todo: "To do", doing: "In progress", review: "Waiting for review", done: "Done" },
  ar: { todo: "لم يبدأ", doing: "قيد التنفيذ", review: "بانتظار المراجعة", done: "تم" },
};
export const PRIORITY_LABEL = {
  en: { low: "Low", normal: "Normal", high: "High", urgent: "Urgent" },
  ar: { low: "منخفضة", normal: "عادية", high: "عالية", urgent: "عاجلة" },
};

// Today as "YYYY-MM-DD" in the browser's time zone — due dates are stored the same way.
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
export const isOverdue = (task) => Boolean(task.dueDate) && task.status !== "done" && task.dueDate < today();

// "Mona Adel" -> "MA" (shown in the small avatar circles).
export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

// "2026-11-03" -> "3 Nov" / "3 نوفمبر"
export const formatDue = (date, lang = "en") =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short" }) : "";

export const stepsDone = (task) => `${task.steps.filter((s) => s.done).length}/${task.steps.length}`;

// The public address of the member portal, to send to new members.
export const portalLink = () => `${window.location.origin}${window.location.pathname}#/team`;
