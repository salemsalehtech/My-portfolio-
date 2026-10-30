// team.js — the member portal API (/api/team). A team member logs in with the username and
// password the owner gave them, then sees their tasks and the projects they belong to.
//
// What a member may do (owner decisions, ROADMAP.md → Wave D):
//   - see the whole board and docs of every project they are a member of,
//   - change the status of THEIR OWN tasks: todo ↔ doing → review ("I'm done, please check");
//     only the owner can approve a task (done) or send it back,
//   - add / tick / edit / remove to-do steps inside their own tasks.
// Creating tasks, assigning them and editing projects is the owner's job (routes/adminTeam.js).
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { TeamMember, TeamProject, TeamTask } = require("../lib/mongo");
const { requireMember, signMemberToken } = require("../middleware/teamAuth");
const { logActivity, MEMBER_PUBLIC } = require("../lib/team");

const router = express.Router();

// Same protection as the admin login: 10 attempts per 15 minutes per visitor.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

// POST /api/team/login { username, password } → { token, member }
router.post("/login", loginLimiter, async (req, res) => {
  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

  // One message for every failure, so the answer never reveals which usernames exist.
  const member = await TeamMember.findOne({ username }).select("+passwordHash");
  if (!member || !member.active || !(await bcrypt.compare(password, member.passwordHash))) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  member.lastLoginAt = new Date();
  await member.save();
  res.json({ token: signMemberToken(member), member });
});

// Everything below needs a valid member token.
router.use(requireMember);

router.get("/me", (req, res) => res.json(req.member));

// POST /api/team/password { current, next } — also how a new member replaces the temporary password.
router.post("/password", async (req, res) => {
  const current = String(req.body?.current ?? "");
  const next = String(req.body?.next ?? "");
  if (next.length < 8 || next.length > 100) return res.status(400).json({ error: "The new password must be 8 to 100 characters" });
  const member = await TeamMember.findById(req.member.id).select("+passwordHash");
  if (!(await bcrypt.compare(current, member.passwordHash))) return res.status(400).json({ error: "The current password is wrong" });
  if (await bcrypt.compare(next, member.passwordHash)) return res.status(400).json({ error: "Choose a password different from the current one" });
  member.passwordHash = await bcrypt.hash(next, 10);
  member.mustChangePassword = false;
  await member.save();
  res.json(member);
});

// Until the temporary password is replaced, nothing else is available.
router.use((req, res, next) => {
  if (req.member.mustChangePassword) return res.status(403).json({ error: "Please choose a new password first", mustChangePassword: true });
  next();
});

// GET /api/team/tasks — my tasks across my projects (finished ones only for the last 14 days).
router.get("/tasks", async (req, res) => {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const tasks = await TeamTask.find({
    assignee: req.member._id,
    $or: [{ status: { $ne: "done" } }, { completedAt: { $gte: since } }],
  })
    .populate("project", "name status")
    .populate("assignee", MEMBER_PUBLIC)
    .sort({ dueDate: 1, createdAt: 1 });
  res.json(tasks.filter((t) => t.project && t.project.status !== "archived"));
});

// GET /api/team/projects — the projects I belong to, with simple progress numbers.
router.get("/projects", async (req, res) => {
  const projects = await TeamProject.find({ members: req.member._id, status: { $ne: "archived" } }).sort({ createdAt: -1 });
  const counts = await TeamTask.aggregate([
    { $match: { project: { $in: projects.map((p) => p._id) } } },
    { $group: { _id: "$project", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json(projects.map((p) => ({ ...p.toJSON(), docs: undefined, total: byId[p.id]?.total || 0, done: byId[p.id]?.done || 0 })));
});

// GET /api/team/projects/:id — one of my projects: docs, links, members and the whole board.
router.get("/projects/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Project not found" });
  const project = await TeamProject.findOne({ _id: req.params.id, members: req.member._id, status: { $ne: "archived" } })
    .populate("members", MEMBER_PUBLIC);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const tasks = await TeamTask.find({ project: project._id }).populate("assignee", MEMBER_PUBLIC).sort({ order: 1, createdAt: 1 });
  res.json({ project, tasks });
});

// Loads a task that belongs to the logged-in member (404 for anyone else's task).
async function ownTask(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Task not found" }); return null; }
  const task = await TeamTask.findOne({ _id: req.params.id, assignee: req.member._id });
  if (!task) { res.status(404).json({ error: "Task not found" }); return null; }
  return task;
}

// Which status changes a member may make: from → allowed targets. "done" is the owner's call.
const MEMBER_MOVES = { todo: ["doing", "review"], doing: ["todo", "review"], review: ["doing"], done: [] };

// PATCH /api/team/tasks/:id/status { status }
router.patch("/tasks/:id/status", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  const status = String(req.body?.status ?? "");
  if (!MEMBER_MOVES[task.status].includes(status)) {
    return res.status(400).json({ error: task.status === "done" ? "This task is already approved" : "This status change is not allowed" });
  }
  task.status = status;
  if (status === "review") task.submittedAt = new Date();
  await task.save();
  const action = status === "review" ? "submitted" : status === "doing" ? "started" : "moved";
  logActivity({ project: task.project, task: task._id, member: req.member._id, action, detail: task.title });
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});

// To-do steps inside my own task.
router.post("/tasks/:id/steps", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  task.steps.push({ text: String(req.body?.text ?? "") });
  await task.save();
  res.status(201).json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.patch("/tasks/:id/steps/:stepId", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  const step = mongoose.isValidObjectId(req.params.stepId) && task.steps.id(req.params.stepId);
  if (!step) return res.status(404).json({ error: "Step not found" });
  if ("done" in (req.body || {})) step.done = Boolean(req.body.done);
  if ("text" in (req.body || {})) step.text = String(req.body.text);
  await task.save();
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.delete("/tasks/:id/steps/:stepId", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  const step = mongoose.isValidObjectId(req.params.stepId) && task.steps.id(req.params.stepId);
  if (!step) return res.status(404).json({ error: "Step not found" });
  step.deleteOne();
  await task.save();
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});

module.exports = router;
