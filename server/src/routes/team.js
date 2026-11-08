// team.js — the member portal API (/api/team). A team member logs in with the username and
// password the owner gave them, then sees their tasks and the projects they belong to.
//
// What a member may do (owner decisions, ROADMAP.md → Wave D):
//   - see the whole board and docs of every project they are a member of,
//   - change the status of THEIR OWN tasks: todo ↔ doing → review ("I'm done, please check");
//     only the owner can approve a task (done) or send it back,
//   - add / tick / edit / remove to-do steps inside their own tasks,
//   - comment on any task of their projects (and delete their own comments),
//   - open the files attached to any task of their projects, and attach their own result to
//     their own task,
//   - flag "I need help" or ask for more time (a new due date) on their own task,
//   - set their availability (available / busy / away until a date),
//   - read their notifications 🔔 (plus live due-date reminders) and fill in the daily standup.
// Creating tasks, assigning them and editing projects is the owner's job (routes/adminTeam.js).
// New members either get an account from the owner, or sign up themselves with an invite link
// (GET /invites/:token + POST /signup) and then wait for the owner's approval.
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { TeamMember, TeamProject, TeamTask, TeamComment, TeamNotification, TeamStandup, TeamInvite, TeamAttachment, TeamSettings, TeamKudos } = require("../lib/mongo");
const { badgesFor, teamGoal } = require("../lib/teamScores");
const { readAttachmentUpload, sendAttachment, MAX_ATTACHMENTS_PER_TASK } = require("../lib/attachments");
const { vapid, saveSubscription } = require("../lib/push");
const { requireMember, signMemberToken } = require("../middleware/teamAuth");
const { todayCairo, logActivity, notify, bellFor, withCommentCounts, addComment, listComments, hashInviteToken, usableInvite, MEMBER_PUBLIC } = require("../lib/team");
const { passwordProblem } = require("../lib/passwords");

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
  // Only said after the right password, so it never reveals which usernames exist.
  if (member.pending) return res.status(403).json({ error: "Your account is waiting for approval", pending: true });
  member.lastLoginAt = new Date();
  await member.save();
  res.json({ token: signMemberToken(member), member });
});

// ---- Sign up with an invite link ----
// Same limit as the login: 10 tries per 15 minutes per visitor (also stops guessing tokens).
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

// GET /api/team/invites/:token → { valid } — lets the sign-up page say early that a link is dead.
router.get("/invites/:token", signupLimiter, async (req, res) => {
  const invite = await TeamInvite.findOne({ tokenHash: hashInviteToken(req.params.token), ...usableInvite() });
  res.json({ valid: Boolean(invite) });
});

// GET /api/team/rules → { version, rulesEn, rulesAr } — the team rules, also shown on the sign-up
// page before anyone joins (version 0 = no rules published yet).
router.get("/rules", signupLimiter, async (req, res) => {
  const s = await TeamSettings.findOne().select("rulesVersion rulesEn rulesAr").lean();
  res.set("Cache-Control", "public, max-age=60");
  res.json(s?.rulesVersion ? { version: s.rulesVersion, rulesEn: s.rulesEn, rulesAr: s.rulesAr } : { version: 0, rulesEn: "", rulesAr: "" });
});

// POST /api/team/signup { token, name, specialty, username, password, agreeRules } → the new (pending) account.
router.post("/signup", signupLimiter, async (req, res) => {
  const rulesVersion = (await TeamSettings.findOne().select("rulesVersion").lean())?.rulesVersion || 0;
  if (rulesVersion && req.body?.agreeRules !== true) return res.status(400).json({ error: "Read the team rules and agree to them first" });
  const password = String(req.body?.password ?? "");
  const problem = passwordProblem(password);
  if (problem) return res.status(400).json({ error: problem });
  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const name = String(req.body?.name ?? "").trim();
  if (!name || name.length > 80) return res.status(400).json({ error: "Write your name (up to 80 characters)" });
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: "Username: 3–30 characters, a-z, 0-9, dot, dash or underscore" });
  if (await TeamMember.exists({ username })) return res.status(400).json({ error: "This username is taken — choose another one" });

  // Use up one place on the invite in a single step, so two people can't take the last one.
  const invite = await TeamInvite.findOneAndUpdate(
    { tokenHash: hashInviteToken(req.body?.token), ...usableInvite() },
    { $inc: { uses: 1 } },
    { new: true }
  );
  if (!invite) return res.status(400).json({ error: "This invite link is no longer valid. Ask for a new one." });
  try {
    const member = await TeamMember.create({
      username,
      name,
      specialty: req.body?.specialty,
      passwordHash: await bcrypt.hash(password, 10),
      mustChangePassword: false, // they chose this password themselves
      pending: true,
      invite: invite._id,
      rulesAgreed: rulesVersion,
    });
    notify({ kind: "signup", actor: member.name, detail: member.specialty || member.username });
    res.status(201).json({ member: { name: member.name, username: member.username }, pending: true });
  } catch (err) {
    await TeamInvite.updateOne({ _id: invite._id }, { $inc: { uses: -1 } }); // give the place back
    throw err;
  }
});

// Everything below needs a valid member token.
router.use(requireMember);

router.get("/me", (req, res) => res.json(req.member));

// POST /api/team/password { current, next } — also how a new member replaces the temporary password.
router.post("/password", async (req, res) => {
  const current = String(req.body?.current ?? "");
  const next = String(req.body?.next ?? "");
  const problem = passwordProblem(next);
  if (problem) return res.status(400).json({ error: problem });
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

// ---- Phone notifications (Web Push, lib/teamPush.js — with quiet hours) ----
router.get("/push/key", async (req, res) => res.json(await vapid()));
router.post("/push/subscribe", async (req, res) => {
  if (!(await saveSubscription(req.member._id, req.body))) return res.status(400).json({ error: "Invalid subscription" });
  res.status(201).json({ ok: true });
});

// POST /api/team/rules/agree { version } — "I read the rules and agree" (the version they read,
// so agreeing to an old copy doesn't count for a newer one).
router.post("/rules/agree", async (req, res) => {
  const current = (await TeamSettings.findOne().select("rulesVersion").lean())?.rulesVersion || 0;
  if (!current || Number(req.body?.version) !== current) return res.status(409).json({ error: "The rules were updated — read them again" });
  req.member.rulesAgreed = current;
  await req.member.save();
  res.json(req.member);
});
// POST /api/team/tour-done — the first-login tour was seen (or skipped).
router.post("/tour-done", async (req, res) => {
  req.member.tourDone = true;
  await req.member.save();
  res.json(req.member);
});

// GET /api/team/cheers — the encouraging side for the home page: thank-you notes from the owner,
// my badges, and the shared team goal. Never a rank, points or ratings (those stay with the owner).
router.get("/cheers", async (req, res) => {
  const [kudos, badges, goal] = await Promise.all([
    TeamKudos.find({ member: req.member._id }).sort({ createdAt: -1 }).limit(10).populate("task", "title").lean(),
    badgesFor(req.member._id),
    teamGoal(),
  ]);
  res.json({ kudos: kudos.map(({ _id, __v, member, ...k }) => ({ id: String(_id), ...k })), badges, goal });
});

// PUT /api/team/availability { status, until, note } — "available" / "busy" / "away until …".
router.put("/availability", async (req, res) => {
  const { status = "available", until = "", note = "" } = req.body || {};
  req.member.availability = { status, until: status === "available" ? "" : until, note: status === "available" ? "" : note };
  await req.member.save();
  res.json(req.member);
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
  res.json(await withCommentCounts(tasks.filter((t) => t.project && t.project.status !== "archived")));
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
  res.json({ project, tasks: await withCommentCounts(tasks) });
});

// Loads a task that belongs to the logged-in member (404 for anyone else's task).
async function ownTask(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Task not found" }); return null; }
  const task = await TeamTask.findOne({ _id: req.params.id, assignee: req.member._id });
  if (!task) { res.status(404).json({ error: "Task not found" }); return null; }
  return task;
}

// Loads any task of a project I belong to (to read it or comment on it).
async function visibleTask(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Task not found" }); return null; }
  const task = await TeamTask.findById(req.params.id);
  const project = task && await TeamProject.exists({ _id: task.project, members: req.member._id, status: { $ne: "archived" } });
  if (!project) { res.status(404).json({ error: "Task not found" }); return null; }
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
  if (status === "review") notify({ kind: "submitted", actor: req.member.name, task: task._id, project: task.project, detail: task.title });
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

// ---- Open pool: unassigned tasks the owner marked "anyone can take it" ----
// GET /pool — such tasks in my projects; POST /tasks/:id/claim — take one. The claim is one atomic
// update that only matches while the task is still free, so when two members press at the same
// moment exactly one gets it and the other is told it's gone.
router.get("/pool", async (req, res) => {
  const projects = await TeamProject.find({ members: req.member._id, status: "active" }).select("name").lean();
  const tasks = await TeamTask.find({ project: { $in: projects.map((p) => p._id) }, assignee: null, claimable: true, status: { $ne: "done" } })
    .select("project title priority dueDate").sort({ dueDate: 1, createdAt: 1 }).limit(30).lean();
  const names = Object.fromEntries(projects.map((p) => [String(p._id), p.name]));
  res.json(tasks.map(({ _id, project, ...t }) => ({ id: String(_id), project: { id: String(project), name: names[String(project)] }, ...t })));
});
router.post("/tasks/:id/claim", async (req, res) => {
  const task = await visibleTask(req, res);
  if (!task) return;
  const claimed = await TeamTask.findOneAndUpdate(
    { _id: task._id, assignee: null, claimable: true, status: { $ne: "done" } },
    { assignee: req.member._id, claimable: false },
    { new: true }
  );
  if (!claimed) return res.status(409).json({ error: "Someone already took this task" });
  logActivity({ project: claimed.project, task: claimed._id, member: req.member._id, action: "claimed", detail: claimed.title });
  notify({ kind: "claimed", actor: req.member.name, task: claimed._id, project: claimed.project, detail: claimed.title });
  res.json(await claimed.populate("assignee", MEMBER_PUBLIC));
});

// ---- Before starting: "I understood", my size estimate, ticking the acceptance criteria ----
router.post("/tasks/:id/understood", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  task.understoodAt = task.understoodAt || new Date();
  await task.save();
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.put("/tasks/:id/estimate", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  task.estimate = String(req.body?.estimate ?? "");
  await task.save();
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.patch("/tasks/:id/criteria/:cid", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  if (task.status === "done") return res.status(400).json({ error: "This task is already approved" });
  const item = mongoose.isValidObjectId(req.params.cid) && task.criteria.id(req.params.cid);
  if (!item) return res.status(404).json({ error: "Not found" });
  item.done = Boolean(req.body?.done);
  await task.save();
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});

// ---- "I need help" / "I need more time" on my own task ----
router.put("/tasks/:id/help", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  const note = String(req.body?.note ?? "").trim();
  if (!note) return res.status(400).json({ error: "Write what you need help with" });
  task.helpNote = note;
  await task.save();
  notify({ kind: "help", actor: req.member.name, task: task._id, project: task.project, detail: task.title });
  logActivity({ project: task.project, task: task._id, member: req.member._id, action: "asked_help", detail: task.title });
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.delete("/tasks/:id/help", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  task.helpNote = "";
  await task.save();
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.put("/tasks/:id/extension", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  if (task.status === "done") return res.status(400).json({ error: "This task is already approved" });
  const date = String(req.body?.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayCairo() || (task.dueDate && date <= task.dueDate)) {
    return res.status(400).json({ error: "Pick a date after the current due date" });
  }
  task.extensionRequest = { date, reason: req.body?.reason, at: new Date() };
  await task.save();
  notify({ kind: "extension", actor: req.member.name, task: task._id, project: task.project, detail: task.title });
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});
router.delete("/tasks/:id/extension", async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  task.extensionRequest = null;
  await task.save();
  res.json(await task.populate("assignee", MEMBER_PUBLIC));
});

// ---- Attachments: everyone on the project opens them; the assignee adds their own result to
// their task (until it is approved) and may remove only the files they added. ----
const uploadLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many uploads. Please wait a few minutes." } });

router.get("/tasks/:id/attachments", async (req, res) => {
  const task = await visibleTask(req, res);
  if (!task) return;
  res.json(await TeamAttachment.find({ task: task._id }).select("-data").sort({ createdAt: 1 }).populate("member", "name"));
});
router.post("/tasks/:id/attachments", uploadLimiter, async (req, res) => {
  const task = await ownTask(req, res);
  if (!task) return;
  if (task.status === "done") return res.status(400).json({ error: "This task is already approved" });
  if (await TeamAttachment.countDocuments({ task: task._id }) >= MAX_ATTACHMENTS_PER_TASK) {
    return res.status(400).json({ error: "Up to 10 files per task" });
  }
  const { file, error } = readAttachmentUpload(req.body);
  if (error) return res.status(400).json({ error });
  const attachment = await TeamAttachment.create({ ...file, task: task._id, project: task.project, member: req.member._id });
  notify({ kind: "file", actor: req.member.name, task: task._id, project: task.project, detail: task.title });
  logActivity({ project: task.project, task: task._id, member: req.member._id, action: "file_added", detail: file.filename });
  res.status(201).json(await attachment.populate("member", "name"));
});
router.delete("/attachments/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "File not found" });
  const gone = await TeamAttachment.findOneAndDelete({ _id: req.params.id, member: req.member._id });
  if (!gone) return res.status(404).json({ error: "File not found" });
  res.status(204).end();
});
router.get("/attachments/:id", async (req, res) => {
  const file = mongoose.isValidObjectId(req.params.id) && await TeamAttachment.findById(req.params.id);
  const allowed = file && await TeamProject.exists({ _id: file.project, members: req.member._id, status: { $ne: "archived" } });
  if (!allowed) return res.status(404).json({ error: "File not found" });
  sendAttachment(res, file);
});

// ---- Comments ----
// 60 comments per 10 minutes is plenty for a person, and stops a runaway script.
const commentLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: "Too many comments. Please wait a few minutes." } });

router.get("/tasks/:id/comments", async (req, res) => {
  const task = await visibleTask(req, res);
  if (!task) return;
  res.json(await listComments(task._id));
});
router.post("/tasks/:id/comments", commentLimiter, async (req, res) => {
  const task = await visibleTask(req, res);
  if (!task) return;
  res.status(201).json(await addComment({ task, author: req.member, body: req.body?.body, replyTo: req.body?.replyTo }));
});
// Members may delete only their own comments.
router.delete("/comments/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Comment not found" });
  const gone = await TeamComment.findOneAndDelete({ _id: req.params.id, member: req.member._id });
  if (!gone) return res.status(404).json({ error: "Comment not found" });
  res.status(204).end();
});

// ---- Notifications 🔔 ----
router.get("/notifications", async (req, res) => {
  res.json(await bellFor(req.member._id, { assignee: req.member._id }));
});
// POST /notifications/read — marks every notification as read (the bell was opened).
router.post("/notifications/read", async (req, res) => {
  await TeamNotification.updateMany({ recipient: req.member._id, read: false }, { read: true });
  res.status(204).end();
});

// ---- Daily standup ----
// GET /standup → today's standup (or null) and the date the server counts as today.
router.get("/standup", async (req, res) => {
  const date = todayCairo();
  res.json({ date, standup: await TeamStandup.findOne({ member: req.member._id, date }) });
});
// PUT /standup { yesterday, today, blockers } — saves (or updates) today's standup.
router.put("/standup", async (req, res) => {
  const date = todayCairo();
  const data = Object.fromEntries(["yesterday", "today", "blockers"].map((k) => [k, String(req.body?.[k] ?? "")]));
  if (!data.yesterday.trim() && !data.today.trim() && !data.blockers.trim()) return res.status(400).json({ error: "Write at least one line" });
  const before = await TeamStandup.findOne({ member: req.member._id, date });
  const standup = await TeamStandup.findOneAndUpdate({ member: req.member._id, date }, data, { new: true, upsert: true, runValidators: true });
  // Tell the owner when someone is blocked (once per new or changed blocker).
  if (standup.blockers && standup.blockers !== (before?.blockers || "")) {
    notify({ kind: "blocker", actor: req.member.name, detail: standup.blockers });
  }
  res.json({ date, standup });
});

module.exports = router;
