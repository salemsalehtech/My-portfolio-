// team.js — small helpers shared by the owner's team routes (routes/adminTeam.js) and the member
// portal (routes/team.js).
const { TeamActivity } = require("./mongo");

// Today's date in Cairo as "YYYY-MM-DD" — due dates are stored the same way, so a plain string
// comparison tells whether a task is overdue.
const todayCairo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());

const isOverdue = (task, today = todayCairo()) => Boolean(task.dueDate) && task.status !== "done" && task.dueDate < today;

// Adds one line to the activity log. `member` is the member who did it, or null for the owner.
// Logging must never break the request that triggered it, so errors are only printed.
function logActivity({ project, task = null, member = null, action, detail = "" }) {
  return TeamActivity.create({ project, task, member, action, detail: String(detail).slice(0, 300) })
    .catch((err) => console.error("Team activity log failed:", err.message));
}

// The fields of a member that other people may see (never the password hash).
const MEMBER_PUBLIC = "name username specialty active";

module.exports = { todayCairo, isOverdue, logActivity, MEMBER_PUBLIC };
