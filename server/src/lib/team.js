// team.js — small helpers shared by the owner's team routes (routes/adminTeam.js) and the member
// portal (routes/team.js).
const crypto = require("crypto");
const mongoose = require("mongoose");
const { TeamActivity, TeamComment, TeamNotification, TeamTask, TeamMember, TeamProject } = require("./mongo");
const { cairoDate, addDays } = require("./dates");
const { pushNow } = require("./teamPush");

// Today's date in Cairo as "YYYY-MM-DD" — due dates are stored the same way, so a plain string
// comparison tells whether a task is overdue.
const todayCairo = () => cairoDate();
const tomorrowCairo = () => addDays(cairoDate(), 1);

const isOverdue = (task, today = todayCairo()) => Boolean(task.dueDate) && task.status !== "done" && task.dueDate < today;

// Adds one line to the activity log. `member` is the member who did it, or null for the owner.
// Logging must never break the request that triggered it, so errors are only printed.
function logActivity({ project, task = null, member = null, action, detail = "" }) {
  return TeamActivity.create({ project, task, member, action, detail: String(detail).slice(0, 300) })
    .catch((err) => console.error("Team activity log failed:", err.message));
}

// Sends a notification to a member (`to` = their id) or to the owner (`to` = null). `actor` is
// the member's name; an empty actor means the owner did it. It goes to the bell, and to the phone
// too (lib/teamPush.js) unless it is quiet time — then it waits for the morning summary.
// Like logging, a failed notification never breaks the request.
function notify({ to = null, kind, actor = "", task = null, project = null, detail = "" }) {
  detail = String(detail).slice(0, 300);
  const pushed = pushNow({ to, kind, actor, detail });
  return TeamNotification.create({ recipient: to, kind, actor, task, project, detail, pushed })
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

// Adds `commentCount` to each task (for the comments badge on the board cards). `owner: true`
// keeps the owner's private rating, which toJSON() hides from members (lib/mongo.js).
async function withCommentCounts(tasks, { owner = false } = {}) {
  const counts = await TeamComment.aggregate([
    { $match: { task: { $in: tasks.map((t) => t._id) } } },
    { $group: { _id: "$task", n: { $sum: 1 } } },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  return tasks.map((t) => ({ ...t.toJSON(), ...(owner ? { rating: t.rating || null } : {}), commentCount: byId[t.id] || 0 }));
}

// ---- Comments (both routers) ----
// "@lead" in a comment means the owner; "@username" a member of the task's project.
const { OWNER_HANDLE } = require("./rules");
const COMMENT_POPULATE = [
  { path: "member", select: "name username specialty" },
  { path: "replyTo", select: "body member byOwner", populate: { path: "member", select: "name" } },
];

// Saves a comment on `task` by `author` (a member document, or null for the owner) and tells
// the right people, each one once and never the author: whoever was @mentioned, the author of
// the comment being answered, the assignee, and the owner (for members' comments).
async function addComment({ task, author = null, body, replyTo = null }) {
  const parent = replyTo && mongoose.isValidObjectId(replyTo)
    ? await TeamComment.findOne({ _id: replyTo, task: task._id }).select("member byOwner").lean()
    : null;
  const comment = await TeamComment.create({
    task: task._id, project: task.project, member: author?._id || null, byOwner: !author, body, replyTo: parent?._id || null,
  });

  const told = new Set([author ? String(author._id) : "owner"]);
  const tell = (to, kind) => {
    const key = to ? String(to) : "owner";
    if (told.has(key)) return;
    told.add(key);
    notify({ to, kind, actor: author?.name || "", task: task._id, project: task.project, detail: task.title });
  };
  const handles = [...new Set((String(body).match(/@([a-z0-9._-]{3,30})/gi) || []).map((h) => h.slice(1).toLowerCase()))];
  if (handles.includes(OWNER_HANDLE)) tell(null, "mention");
  if (handles.length) {
    const project = await TeamProject.findById(task.project).select("members").lean();
    const mentioned = await TeamMember.find({ username: { $in: handles }, _id: { $in: project?.members || [] }, active: true }).select("_id").lean();
    mentioned.forEach((m) => tell(m._id, "mention"));
  }
  if (parent) tell(parent.byOwner ? null : parent.member, "reply");
  if (task.assignee) tell(task.assignee, "comment");
  tell(null, "comment");
  logActivity({ project: task.project, task: task._id, member: author?._id || null, action: "commented", detail: task.title });
  return comment.populate(COMMENT_POPULATE);
}
const listComments = (taskId) => TeamComment.find({ task: taskId }).sort({ createdAt: 1 }).populate(COMMENT_POPULATE);

// Invite links: a random token goes in the link; only its SHA-256 hash is stored.
const newInviteToken = () => crypto.randomBytes(24).toString("base64url");
const hashInviteToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");
// The filter for an invite that can still be used right now.
const usableInvite = () => ({ revoked: false, expiresAt: { $gt: new Date() }, $expr: { $lt: ["$uses", "$maxUses"] } });

// The fields of a member that other people may see (never the password hash).
const MEMBER_PUBLIC = "name username specialty active availability";

module.exports = { todayCairo, isOverdue, logActivity, notify, bellFor, withCommentCounts, addComment, listComments, newInviteToken, hashInviteToken, usableInvite, MEMBER_PUBLIC };
