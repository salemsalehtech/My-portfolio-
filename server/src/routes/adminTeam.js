// adminTeam.js — the owner's side of the team workspace (/api/admin/team, login required — it is
// mounted behind requireAuth in app.js). Members use routes/team.js instead.
//
//   - members: create accounts (temporary password), edit, disable, reset password, delete
//   - projects: create / edit (summary, Markdown docs, links, due date, members, status) / delete
//   - tasks: create, edit, assign, delete; approve a task waiting for review, or send it back
//     with a note
//   - overview: the review queue, progress per project and per member, recent activity
//   - comments on tasks, the owner's notifications 🔔, and every member's daily standups
const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { TeamMember, TeamProject, TeamTask, TeamActivity, TeamComment, TeamNotification, TeamStandup } = require("../lib/mongo");
const { todayCairo, isOverdue, logActivity, notify, bellFor, withCommentCounts, MEMBER_PUBLIC } = require("../lib/team");

const router = express.Router();

const checkPassword = (password) =>
  password.length < 8 || password.length > 100 ? "The password must be 8 to 100 characters" : null;

// ---- Overview ----
router.get("/overview", async (req, res) => {
  const today = todayCairo();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [projects, members, tasks, activity, standups] = await Promise.all([
    TeamProject.find({ status: { $ne: "archived" } }).sort({ createdAt: -1 }),
    TeamMember.find().sort({ name: 1 }),
    TeamTask.find().select("project assignee status dueDate title completedAt submittedAt").populate("assignee", MEMBER_PUBLIC),
    TeamActivity.find().sort({ createdAt: -1 }).limit(30).populate("member", "name").populate("project", "name"),
    TeamStandup.find({ date: today }).select("member blockers"),
  ]);
  const activeIds = new Set(projects.map((p) => p.id));
  const live = tasks.filter((t) => activeIds.has(String(t.project)));

  res.json({
    review: live.filter((t) => t.status === "review")
      .sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0))
      .map((t) => ({ ...t.toJSON(), projectName: projects.find((p) => p.id === String(t.project))?.name })),
    projects: projects.map((p) => {
      const own = live.filter((t) => String(t.project) === p.id);
      return {
        id: p.id, name: p.name, status: p.status, dueDate: p.dueDate,
        total: own.length,
        done: own.filter((t) => t.status === "done").length,
        review: own.filter((t) => t.status === "review").length,
        overdue: own.filter((t) => isOverdue(t, today)).length,
      };
    }),
    members: members.map((m) => {
      const own = live.filter((t) => t.assignee && t.assignee.id === m.id);
      return {
        ...m.toJSON(),
        open: own.filter((t) => t.status !== "done").length,
        overdue: own.filter((t) => isOverdue(t, today)).length,
        doneThisWeek: own.filter((t) => t.status === "done" && t.completedAt && t.completedAt >= weekAgo).length,
      };
    }),
    activity,
    standups: {
      done: standups.length,
      expected: members.filter((m) => m.active).length,
      blocked: standups.filter((s) => s.blockers).length,
    },
  });
});

// ---- Members ----
router.get("/members", async (req, res) => {
  res.json(await TeamMember.find().sort({ name: 1 }));
});
router.post("/members", async (req, res) => {
  const password = String(req.body?.password ?? "");
  const problem = checkPassword(password);
  if (problem) return res.status(400).json({ error: problem });
  const member = await TeamMember.create({
    username: req.body?.username,
    name: req.body?.name,
    specialty: req.body?.specialty,
    passwordHash: await bcrypt.hash(password, 10),
    mustChangePassword: true,
  });
  res.status(201).json(member);
});
router.put("/members/:id", async (req, res) => {
  const data = {};
  for (const f of ["name", "specialty", "active"]) if (f in (req.body || {})) data[f] = req.body[f];
  if ("active" in data) data.active = Boolean(data.active);
  const member = await TeamMember.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json(member);
});
// POST /members/:id/password { password } — a new temporary password; the member must change it.
router.post("/members/:id/password", async (req, res) => {
  const password = String(req.body?.password ?? "");
  const problem = checkPassword(password);
  if (problem) return res.status(400).json({ error: problem });
  const member = await TeamMember.findByIdAndUpdate(
    req.params.id,
    { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true },
    { new: true }
  );
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json(member);
});
// Deleting a member keeps their tasks (unassigned) and removes them from every project.
router.delete("/members/:id", async (req, res) => {
  await TeamMember.findByIdAndDelete(req.params.id);
  await TeamTask.updateMany({ assignee: req.params.id }, { assignee: null });
  await TeamProject.updateMany({}, { $pull: { members: req.params.id } });
  await TeamNotification.deleteMany({ recipient: req.params.id });
  await TeamStandup.deleteMany({ member: req.params.id });
  res.status(204).end();
});

// ---- Projects ----
const PROJECT_FIELDS = ["name", "summary", "docs", "links", "dueDate", "members", "status"];
const pickProject = (body = {}) => Object.fromEntries(PROJECT_FIELDS.filter((f) => f in body).map((f) => [f, body[f]]));

router.get("/projects", async (req, res) => {
  const projects = await TeamProject.find().select("-docs").sort({ createdAt: -1 });
  const counts = await TeamTask.aggregate([
    { $group: { _id: "$project", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json(projects.map((p) => ({ ...p.toJSON(), total: byId[p.id]?.total || 0, done: byId[p.id]?.done || 0 })));
});
router.post("/projects", async (req, res) => {
  const project = await TeamProject.create(pickProject(req.body));
  logActivity({ project: project._id, action: "project_created", detail: project.name });
  res.status(201).json(project);
});
// GET /projects/:id — the project with its members and every task (for the board).
router.get("/projects/:id", async (req, res) => {
  const project = await TeamProject.findById(req.params.id).populate("members", MEMBER_PUBLIC);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const tasks = await TeamTask.find({ project: project._id }).populate("assignee", MEMBER_PUBLIC).sort({ order: 1, createdAt: 1 });
  const activity = await TeamActivity.find({ project: project._id }).sort({ createdAt: -1 }).limit(20).populate("member", "name");
  res.json({ project, tasks: await withCommentCounts(tasks), activity });
});
router.put("/projects/:id", async (req, res) => {
  const project = await TeamProject.findByIdAndUpdate(req.params.id, pickProject(req.body), { new: true, runValidators: true });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});
router.delete("/projects/:id", async (req, res) => {
  await TeamProject.findByIdAndDelete(req.params.id);
  await TeamTask.deleteMany({ project: req.params.id });
  await TeamActivity.deleteMany({ project: req.params.id });
  await TeamComment.deleteMany({ project: req.params.id });
  await TeamNotification.deleteMany({ project: req.params.id });
  res.status(204).end();
});

// ---- Tasks ----
const TASK_FIELDS = ["title", "description", "assignee", "priority", "dueDate", "status", "steps", "order"];
function pickTask(body = {}) {
  const data = Object.fromEntries(TASK_FIELDS.filter((f) => f in body).map((f) => [f, body[f]]));
  if ("assignee" in data && !data.assignee) data.assignee = null;
  if ("steps" in data) {
    data.steps = (Array.isArray(data.steps) ? data.steps : [])
      .map((s = {}) => ({ ...(s._id ? { _id: s._id } : {}), text: String(s.text ?? "").trim(), done: Boolean(s.done) }))
      .filter((s) => s.text);
  }
  return data;
}

// The assignee must be a member of the project (or nobody).
async function checkAssignee(projectId, assignee) {
  if (!assignee) return null;
  const project = await TeamProject.findOne({ _id: projectId, members: assignee });
  return project ? null : "The assignee must be a member of this project";
}

// Keeps the review / completion dates in step with the status the owner sets.
function applyStatusDates(task) {
  if (task.status === "done" && !task.completedAt) task.completedAt = new Date();
  if (task.status !== "done") task.completedAt = null;
}

router.post("/projects/:id/tasks", async (req, res) => {
  const project = await TeamProject.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const data = pickTask(req.body);
  const problem = await checkAssignee(project._id, data.assignee);
  if (problem) return res.status(400).json({ error: problem });
  const task = new TeamTask({ ...data, project: project._id });
  applyStatusDates(task);
  await task.save();
  logActivity({ project: project._id, task: task._id, action: "task_created", detail: task.title });
  if (task.assignee) notify({ to: task.assignee, kind: "assigned", task: task._id, project: project._id, detail: task.title });
  res.status(201).json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.put("/tasks/:id", async (req, res) => {
  const task = await TeamTask.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const data = pickTask(req.body);
  if ("assignee" in data) {
    const problem = await checkAssignee(task.project, data.assignee);
    if (problem) return res.status(400).json({ error: problem });
  }
  const before = String(task.assignee || "");
  const wasDone = task.status === "done";
  task.set(data);
  applyStatusDates(task);
  await task.save();
  if ("assignee" in data && String(task.assignee || "") !== before && task.assignee) {
    logActivity({ project: task.project, task: task._id, action: "assigned", detail: task.title });
    notify({ to: task.assignee, kind: "assigned", task: task._id, project: task.project, detail: task.title });
  }
  // Moving a task to Done (e.g. dragging it on the board) counts as approving it.
  if (!wasDone && task.status === "done" && task.assignee) {
    logActivity({ project: task.project, task: task._id, action: "approved", detail: task.title });
    notify({ to: task.assignee, kind: "approved", task: task._id, project: task.project, detail: task.title });
  }
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.delete("/tasks/:id", async (req, res) => {
  await TeamTask.findByIdAndDelete(req.params.id);
  await TeamComment.deleteMany({ task: req.params.id });
  await TeamNotification.deleteMany({ task: req.params.id });
  res.status(204).end();
});

// Review: approve (→ done) or send back (→ doing, with a note for the member).
router.post("/tasks/:id/approve", async (req, res) => {
  const task = await TeamTask.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  task.status = "done";
  task.reviewNote = "";
  applyStatusDates(task);
  await task.save();
  logActivity({ project: task.project, task: task._id, action: "approved", detail: task.title });
  if (task.assignee) notify({ to: task.assignee, kind: "approved", task: task._id, project: task.project, detail: task.title });
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.post("/tasks/:id/return", async (req, res) => {
  const note = String(req.body?.note ?? "").trim();
  if (!note) return res.status(400).json({ error: "Write what needs to change" });
  const task = await TeamTask.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  task.status = "doing";
  task.reviewNote = note;
  applyStatusDates(task);
  await task.save();
  logActivity({ project: task.project, task: task._id, action: "returned", detail: task.title });
  if (task.assignee) notify({ to: task.assignee, kind: "returned", task: task._id, project: task.project, detail: task.title });
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});

// ---- Comments ----
router.get("/tasks/:id/comments", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Task not found" });
  res.json(await TeamComment.find({ task: req.params.id }).sort({ createdAt: 1 }).populate("member", MEMBER_PUBLIC));
});
router.post("/tasks/:id/comments", async (req, res) => {
  const task = mongoose.isValidObjectId(req.params.id) && await TeamTask.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const comment = await TeamComment.create({ task: task._id, project: task.project, member: null, byOwner: true, body: req.body?.body });
  if (task.assignee) notify({ to: task.assignee, kind: "comment", task: task._id, project: task.project, detail: task.title });
  logActivity({ project: task.project, task: task._id, action: "commented", detail: task.title });
  res.status(201).json(comment);
});
// The owner may delete any comment.
router.delete("/comments/:id", async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) await TeamComment.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// ---- Notifications 🔔 (recipient null = the owner) ----
router.get("/notifications", async (req, res) => {
  const active = await TeamProject.find({ status: { $ne: "archived" } }).distinct("_id");
  res.json(await bellFor(null, { project: { $in: active } }));
});
router.post("/notifications/read", async (req, res) => {
  await TeamNotification.updateMany({ recipient: null, read: false }, { read: true });
  res.status(204).end();
});

// ---- Daily standups ----
// GET /standups?date=YYYY-MM-DD (default today) → { date, today, entries, missing }
router.get("/standups", async (req, res) => {
  const today = todayCairo();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date)) ? String(req.query.date) : today;
  const [entries, members] = await Promise.all([
    TeamStandup.find({ date }).populate("member", MEMBER_PUBLIC).sort({ updatedAt: -1 }),
    TeamMember.find({ active: true }).select(MEMBER_PUBLIC).sort({ name: 1 }),
  ]);
  const wrote = new Set(entries.filter((e) => e.member).map((e) => e.member.id));
  res.json({ date, today, entries: entries.filter((e) => e.member), missing: members.filter((m) => !wrote.has(m.id)) });
});

module.exports = router;
