// team.js — small helpers shared by the owner's team routes (routes/adminTeam.js) and the member
// portal (routes/team.js).
const { TeamActivity, TeamComment, TeamNotification, TeamTask } = require("./mongo");

// Today's date in Cairo as "YYYY-MM-DD" — due dates are stored the same way, so a plain string
// comparison tells whether a task is overdue.
const todayCairo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
const tomorrowCairo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

const isOverdue = (task, today = todayCairo()) => Boolean(task.dueDate) && task.status !== "done" && task.dueDate < today;

// Adds one line to the activity log. `member` is the member who did it, or null for the owner.
// Logging must never break the request that triggered it, so errors are only printed.
function logActivity({ project, task = null, member = null, action, detail = "" }) {
  return TeamActivity.create({ project, task, member, action, detail: String(detail).slice(0, 300) })
    .catch((err) => console.error("Team activity log failed:", err.message));
}

// Sends a notification to a member (`to` = their id) or to the owner (`to` = null). `actor` is
// the member's name; an empty actor means the owner did it.
// Like logging, a failed notification never breaks the request.
function notify({ to = null, kind, actor = "", task = null, project = null, detail = "" }) {
  return TeamNotification.create({ recipient: to, kind, actor, task, project, detail: String(detail).slice(0, 300) })
    .catch((err) => console.error("Team notification failed:", err.message));
}

// The bell's content for a member (`recipient` = their id) or the owner (null): the latest 30
// notifications, the unread count, and due-date reminders worked out live from the tasks —
// overdue, due today and due tomorrow (for the owner: every overdue task of active work).
async function bellFor(recipient, taskFilter) {
  const today = todayCairo();
  const tomorrow = tomorrowCairo();
  const [items, unread, due] = await Promise.all([
    TeamNotification.find({ recipient }).sort({ createdAt: -1 }).limit(30),
    TeamNotification.countDocuments({ recipient, read: false }),
    TeamTask.find({ ...taskFilter, status: { $nin: ["done", "review"] }, dueDate: { $ne: "", $lte: recipient ? tomorrow : today } })
      .select("title dueDate project status")
      .populate("project", "name status")
      .sort({ dueDate: 1 })
      .limit(20),
  ]);
  const reminders = due
    .filter((t) => t.project && t.project.status !== "archived")
    .map((t) => ({
      task: t.id, project: t.project.id, projectName: t.project.name, title: t.title, dueDate: t.dueDate,
      when: t.dueDate < today ? "overdue" : t.dueDate === today ? "today" : "tomorrow",
    }));
  return { items, unread, reminders };
}

// Adds `commentCount` to each task (for the 💬 badge on the board cards).
async function withCommentCounts(tasks) {
  const counts = await TeamComment.aggregate([
    { $match: { task: { $in: tasks.map((t) => t._id) } } },
    { $group: { _id: "$task", n: { $sum: 1 } } },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  return tasks.map((t) => ({ ...t.toJSON(), commentCount: byId[t.id] || 0 }));
}

// The fields of a member that other people may see (never the password hash).
const MEMBER_PUBLIC = "name username specialty active";

module.exports = { todayCairo, isOverdue, logActivity, notify, bellFor, withCommentCounts, MEMBER_PUBLIC };
