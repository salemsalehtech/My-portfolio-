// adminTeam.js — the owner's side of the team workspace (/api/admin/team, login required — it is
// mounted behind requireAuth in app.js). Members use routes/team.js instead.
//
//   - members: create accounts (temporary password), edit, disable, reset password, delete
//   - projects: create / edit (summary, Markdown docs, links, due date, members, status) / delete
//   - tasks: create, edit, assign, delete; approve a task waiting for review, or send it back
//     with a note
//   - overview: the review queue, progress per project and per member, recent activity
//   - files attached to tasks (PDF / pictures, lib/attachments.js)
//   - comments on tasks, the owner's notifications 🔔, and every member's daily standups
//   - invite links for self sign-up, and approving the accounts made with them
const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { TeamMember, TeamProject, TeamTask, TeamActivity, TeamComment, TeamNotification, TeamStandup, TeamInvite, TeamAttachment, TeamKudos, TeamTemplate, TeamSettings } = require("../lib/mongo");
const rateLimit = require("express-rate-limit");
const { scoresBetween, badgesFor, teamGoal, monthBounds, currentMonth, lastDays } = require("../lib/teamScores");
const { weeklySummary } = require("../lib/teamJobs");
const { improveBrief, aiEnabled } = require("../lib/ai");
const { readAttachmentUpload, sendAttachment, MAX_ATTACHMENTS_PER_TASK } = require("../lib/attachments");
const { only } = require("../lib/fields");
const { todayCairo, isOverdue, logActivity, notify, bellFor, withCommentCounts, addComment, listComments, newInviteToken, hashInviteToken, MEMBER_PUBLIC } = require("../lib/team");
const { passwordProblem } = require("../lib/passwords");

const router = express.Router();

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
    pending: members.filter((m) => m.pending).length,
    standups: {
      done: standups.length,
      expected: members.filter((m) => m.active && !m.pending).length,
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
  const problem = passwordProblem(password);
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
// POST /members/:id/approve — lets a member who signed up with an invite log in.
// (Rejecting = deleting the account with DELETE /members/:id.)
router.post("/members/:id/approve", async (req, res) => {
  const member = await TeamMember.findByIdAndUpdate(req.params.id, { pending: false }, { new: true });
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json(member);
});
// POST /members/:id/password { password } — a new temporary password; the member must change it.
router.post("/members/:id/password", async (req, res) => {
  const password = String(req.body?.password ?? "");
  const problem = passwordProblem(password);
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

// ---- Invite links ----
// GET /invites → every invite with its state (the links themselves are never shown again).
router.get("/invites", async (req, res) => {
  const [invites, joined] = await Promise.all([
    TeamInvite.find().sort({ createdAt: -1 }).limit(50),
    TeamMember.find({ invite: { $ne: null } }).select("name invite"),
  ]);
  const now = new Date();
  res.json(invites.map((i) => ({
    ...i.toJSON(),
    state: i.revoked ? "revoked" : i.uses >= i.maxUses ? "used" : i.expiresAt <= now ? "expired" : "active",
    members: joined.filter((m) => String(m.invite) === i.id).map((m) => m.name),
  })));
});
// POST /invites { label, maxUses (1–50), days (1–30) } → { invite, token } — the token only now.
router.post("/invites", async (req, res) => {
  const maxUses = Math.min(50, Math.max(1, parseInt(req.body?.maxUses, 10) || 1));
  const days = Math.min(30, Math.max(1, parseInt(req.body?.days, 10) || 7));
  const token = newInviteToken();
  const invite = await TeamInvite.create({
    tokenHash: hashInviteToken(token),
    label: req.body?.label,
    maxUses,
    expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
  });
  res.status(201).json({ invite: { ...invite.toJSON(), tokenHash: undefined, state: "active", members: [] }, token });
});
// DELETE /invites/:id — stops the link from working (kept in the list as "revoked").
router.delete("/invites/:id", async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) await TeamInvite.updateOne({ _id: req.params.id }, { revoked: true });
  res.status(204).end();
});

// ---- Projects ----
const PROJECT_FIELDS = ["name", "summary", "docs", "links", "dueDate", "members", "status"];
const pickProject = (body = {}) => only(body, PROJECT_FIELDS);

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
  res.json({ project, tasks: await withCommentCounts(tasks, { owner: true }), activity });
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
  await TeamAttachment.deleteMany({ project: req.params.id });
  await TeamNotification.deleteMany({ project: req.params.id });
  res.status(204).end();
});

// ---- Tasks ----
const TASK_FIELDS = ["title", "description", "assignee", "priority", "dueDate", "status", "steps", "criteria", "order", "helpNote", "claimable"];
// A checklist from the form ({ text, done }[]): trimmed, empty lines dropped, ids kept for edits.
const checklist = (list) => (Array.isArray(list) ? list : [])
  .map((s = {}) => ({ ...(s._id ? { _id: s._id } : {}), text: String(s.text ?? "").trim(), done: Boolean(s.done) }))
  .filter((s) => s.text);
function pickTask(body = {}) {
  const data = only(body, TASK_FIELDS);
  if ("assignee" in data && !data.assignee) data.assignee = null;
  if ("steps" in data) data.steps = checklist(data.steps);
  if ("criteria" in data) data.criteria = checklist(data.criteria);
  if ("claimable" in data) data.claimable = Boolean(data.claimable);
  return data;
}

// Loads the task in :id, or answers 404 (also for a malformed id) and returns null.
async function loadTask(req, res) {
  const task = mongoose.isValidObjectId(req.params.id) && await TeamTask.findById(req.params.id);
  if (!task) res.status(404).json({ error: "Task not found" });
  return task || null;
}
// A task as the owner sees it: with the assignee and the private rating (hidden from members).
const ownerTask = async (task) => ({ ...(await task.populate("assignee", MEMBER_PUBLIC)).toJSON(), rating: task.rating || null });

// The assignee must be a member of the project (or nobody).
async function checkAssignee(projectId, assignee) {
  if (!assignee) return null;
  const project = await TeamProject.exists({ _id: projectId, members: assignee });
  return project ? null : "The assignee must be a member of this project";
}

// Keeps the review / completion dates in step with the status the owner sets.
function applyStatusDates(task) {
  if (task.status === "done" && !task.completedAt) task.completedAt = new Date();
  if (task.status !== "done") task.completedAt = null;
}

// The owner's rating for an approved task ({ quality, creativity, conduct, bonus, note }), or
// null when none was given. Each score is a whole number 1–5; bonus 0–3 for going beyond the task.
function readRating(body) {
  if (!body || typeof body !== "object") return null;
  const score = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));
  if (![body.quality, body.creativity, body.conduct].every((v) => Number(v) >= 1)) return null;
  return {
    quality: score(body.quality, 1, 5), creativity: score(body.creativity, 1, 5), conduct: score(body.conduct, 1, 5),
    bonus: score(body.bonus, 0, 3), note: String(body.note ?? "").trim().slice(0, 500),
  };
}
// Marks a task done (approve button, or dragging it to Done) and tells the assignee.
function approveTask(task, rating) {
  task.status = "done";
  task.reviewNote = "";
  task.helpNote = "";
  task.extensionRequest = null;
  if (rating) task.rating = rating;
  applyStatusDates(task);
}
function announceApproval(task) {
  logActivity({ project: task.project, task: task._id, action: "approved", detail: task.title });
  if (task.assignee) notify({ to: task.assignee, kind: "approved", task: task._id, project: task.project, detail: task.title });
}

router.post("/projects/:id/tasks", async (req, res) => {
  const project = mongoose.isValidObjectId(req.params.id) && await TeamProject.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const data = pickTask(req.body);
  const problem = await checkAssignee(project._id, data.assignee);
  if (problem) return res.status(400).json({ error: problem });
  const task = new TeamTask({ ...data, project: project._id });
  applyStatusDates(task);
  await task.save();
  logActivity({ project: project._id, task: task._id, action: "task_created", detail: task.title });
  if (task.assignee) notify({ to: task.assignee, kind: "assigned", task: task._id, project: project._id, detail: task.title });
  res.status(201).json(await ownerTask(task));
});
router.put("/tasks/:id", async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  const data = pickTask(req.body);
  if ("assignee" in data) {
    const problem = await checkAssignee(task.project, data.assignee);
    if (problem) return res.status(400).json({ error: problem });
  }
  const before = String(task.assignee || "");
  const wasDone = task.status === "done";
  // A move to Done goes through approveTask(), like the Approve button.
  const { status } = data;
  delete data.status;
  const toDone = !wasDone && status === "done";
  task.set(data);
  if (toDone) approveTask(task, null);
  else if (status && status !== task.status) { task.status = status; applyStatusDates(task); }
  await task.save();
  if ("assignee" in data && String(task.assignee || "") !== before && task.assignee) {
    logActivity({ project: task.project, task: task._id, action: "assigned", detail: task.title });
    notify({ to: task.assignee, kind: "assigned", task: task._id, project: task.project, detail: task.title });
  }
  if (toDone) announceApproval(task);
  res.json(await ownerTask(task));
});
router.delete("/tasks/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(204).end();
  await Promise.all([
    TeamTask.deleteOne({ _id: req.params.id }),
    TeamComment.deleteMany({ task: req.params.id }),
    TeamAttachment.deleteMany({ task: req.params.id }),
    TeamNotification.deleteMany({ task: req.params.id }),
    TeamKudos.updateMany({ task: req.params.id }, { task: null }),
  ]);
  res.status(204).end();
});

// Review: approve (→ done, with an optional private rating) or send back (→ doing, with a note).
router.post("/tasks/:id/approve", async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  approveTask(task, readRating(req.body?.rating));
  await task.save();
  announceApproval(task);
  res.json(await ownerTask(task));
});
// Rate (or re-rate) a task that is already done.
router.put("/tasks/:id/rating", async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  if (task.status !== "done") return res.status(400).json({ error: "Only approved tasks can be rated" });
  task.rating = readRating(req.body);
  await task.save();
  res.json(await ownerTask(task));
});
router.post("/tasks/:id/return", async (req, res) => {
  const note = String(req.body?.note ?? "").trim();
  if (!note) return res.status(400).json({ error: "Write what needs to change" });
  const task = await loadTask(req, res);
  if (!task) return;
  task.status = "doing";
  task.reviewNote = note;
  task.returnedCount += 1;
  task.criteria.forEach((c) => { c.done = false; });
  applyStatusDates(task);
  await task.save();
  logActivity({ project: task.project, task: task._id, action: "returned", detail: task.title });
  if (task.assignee) notify({ to: task.assignee, kind: "returned", task: task._id, project: task.project, detail: task.title });
  res.json(await ownerTask(task));
});

// The member asked for more time: { approve: true } moves the due date to the date they asked
// for, { approve: false } keeps it. Either way the request is closed and the member is told.
router.post("/tasks/:id/extension", async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  if (!task.extensionRequest) return res.status(400).json({ error: "There is no open request" });
  const approve = Boolean(req.body?.approve);
  if (approve) task.dueDate = task.extensionRequest.date;
  task.extensionRequest = null;
  await task.save();
  if (task.assignee) notify({ to: task.assignee, kind: approve ? "extension_ok" : "extension_no", task: task._id, project: task.project, detail: task.title });
  res.json(await ownerTask(task));
});

// ---- Attachments (a PDF brief, screenshots… — max 5 MB each, 10 per task) ----
router.get("/tasks/:id/attachments", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Task not found" });
  res.json(await TeamAttachment.find({ task: req.params.id }).select("-data").sort({ createdAt: 1 }).populate("member", "name"));
});
router.post("/tasks/:id/attachments", async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  if (await TeamAttachment.countDocuments({ task: task._id }) >= MAX_ATTACHMENTS_PER_TASK) {
    return res.status(400).json({ error: "Up to 10 files per task" });
  }
  const { file, error } = readAttachmentUpload(req.body);
  if (error) return res.status(400).json({ error });
  const attachment = await TeamAttachment.create({ ...file, task: task._id, project: task.project });
  // A brand-new task already told its assignee "assigned to you" — files sent with it in the same
  // save don't need one more notification each.
  const isNewTask = Date.now() - task.createdAt.getTime() < 2 * 60 * 1000;
  if (task.assignee && !isNewTask) notify({ to: task.assignee, kind: "file", task: task._id, project: task.project, detail: task.title });
  logActivity({ project: task.project, task: task._id, action: "file_added", detail: file.filename });
  res.status(201).json(attachment);
});
router.get("/attachments/:id", async (req, res) => {
  const file = mongoose.isValidObjectId(req.params.id) && await TeamAttachment.findById(req.params.id);
  if (!file) return res.status(404).json({ error: "File not found" });
  sendAttachment(res, file);
});
router.delete("/attachments/:id", async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) await TeamAttachment.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// ---- Comments ----
router.get("/tasks/:id/comments", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Task not found" });
  res.json(await listComments(req.params.id));
});
router.post("/tasks/:id/comments", async (req, res) => {
  const task = await loadTask(req, res);
  if (!task) return;
  res.status(201).json(await addComment({ task, author: null, body: req.body?.body, replyTo: req.body?.replyTo }));
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
    TeamMember.find({ active: true, pending: { $ne: true } }).select(MEMBER_PUBLIC).sort({ name: 1 }),
  ]);
  const wrote = new Set(entries.filter((e) => e.member).map((e) => e.member.id));
  res.json({ date, today, entries: entries.filter((e) => e.member), missing: members.filter((m) => !wrote.has(m.id)) });
});

// ---- Task templates (+ recurring tasks, made by lib/teamJobs.js) ----
const TEMPLATE_FIELDS = ["name", "title", "description", "priority", "steps", "criteria", "repeat"];
function pickTemplate(body = {}) {
  const data = only(body, TEMPLATE_FIELDS);
  const lines = (list) => (Array.isArray(list) ? list : []).map((s = {}) => ({ text: String(s.text ?? "").trim() })).filter((s) => s.text).slice(0, 50);
  if ("steps" in data) data.steps = lines(data.steps);
  if ("criteria" in data) data.criteria = lines(data.criteria);
  if ("repeat" in data) {
    const r = data.repeat || {};
    data.repeat = {
      every: r.every, weekday: r.weekday, monthDay: r.monthDay, dueInDays: r.dueInDays,
      project: r.project || null, assignee: r.assignee || null,
    };
  }
  return data;
}
// A repeating template needs a project, and its assignee must be in that project.
async function checkTemplate(t) {
  if (t.repeat?.every === "none") return null;
  if (!t.repeat?.project) return "Pick the project the repeating task goes to";
  return checkAssignee(t.repeat.project, t.repeat.assignee);
}
router.get("/templates", async (req, res) => {
  res.json(await TeamTemplate.find().sort({ name: 1 }).populate("repeat.project", "name").populate("repeat.assignee", "name"));
});
router.post("/templates", async (req, res) => {
  const template = new TeamTemplate(pickTemplate(req.body));
  const problem = await checkTemplate(template);
  if (problem) return res.status(400).json({ error: problem });
  res.status(201).json(await template.save());
});
router.put("/templates/:id", async (req, res) => {
  const template = mongoose.isValidObjectId(req.params.id) && await TeamTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: "Template not found" });
  template.set(pickTemplate(req.body));
  const problem = await checkTemplate(template);
  if (problem) return res.status(400).json({ error: problem });
  res.json(await template.save());
});
router.delete("/templates/:id", async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) await TeamTemplate.deleteOne({ _id: req.params.id });
  res.status(204).end();
});

// ---- Settings: team rules (bilingual Markdown, versioned) and the shared monthly goal ----
const teamSettings = async () => (await TeamSettings.findOne()) || new TeamSettings();
router.get("/settings", async (req, res) => {
  const [settings, members] = await Promise.all([
    teamSettings(),
    TeamMember.find({ active: true, pending: false }).select("name rulesAgreed").sort({ name: 1 }).lean(),
  ]);
  res.json({
    ...settings.toJSON(),
    agreements: members.map((m) => ({ id: String(m._id), name: m.name, agreed: settings.rulesVersion > 0 && m.rulesAgreed >= settings.rulesVersion })),
  });
});
// PUT /settings { rulesEn, rulesAr, publish, goalTarget, goalLabel } — `publish: true` raises the
// rules version, so every member is asked to read and agree again.
router.put("/settings", async (req, res) => {
  const settings = await teamSettings();
  settings.set(only(req.body || {}, ["rulesEn", "rulesAr", "goalTarget", "goalLabel"]));
  const publish = Boolean(req.body?.publish) && (settings.rulesEn.trim() || settings.rulesAr.trim());
  if (publish) settings.rulesVersion += 1;
  await settings.save();
  if (publish) {
    const members = await TeamMember.find({ active: true, pending: false }).select("_id").lean();
    members.forEach((m) => notify({ to: m._id, kind: "rules" }));
  }
  res.json(settings);
});

// ---- Thank-you notes and star of the week ----
router.get("/kudos", async (req, res) => {
  res.json(await TeamKudos.find().sort({ createdAt: -1 }).limit(50).populate("member", "name").populate("task", "title"));
});
router.post("/kudos", async (req, res) => {
  const { member: memberId, message, task = null, star = false } = req.body || {};
  const member = mongoose.isValidObjectId(memberId) && await TeamMember.exists({ _id: memberId, active: true });
  if (!member) return res.status(400).json({ error: "Pick a member" });
  const kudos = await TeamKudos.create({ member: memberId, message, task: mongoose.isValidObjectId(task) ? task : null, star: Boolean(star) });
  notify({ to: memberId, kind: star ? "star" : "kudos", detail: kudos.message });
  res.status(201).json(await kudos.populate("member", "name"));
});
router.delete("/kudos/:id", async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) await TeamKudos.deleteOne({ _id: req.params.id });
  res.status(204).end();
});

// ---- Scores (owner only): ranking for a month, star-of-the-week suggestion, goal, badges ----
router.get("/scores", async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month)) ? String(req.query.month) : currentMonth();
  const [ranking, week, goal] = await Promise.all([
    scoresBetween(...monthBounds(month)),
    scoresBetween(...lastDays(7)),
    teamGoal(),
  ]);
  const badges = await Promise.all(ranking.map((r) => badgesFor(r.member.id)));
  const top = week.find((r) => r.points > 0) || null;
  res.json({ month, ranking: ranking.map((r, i) => ({ ...r, badges: badges[i] })), starSuggestion: top && { member: top.member, points: top.points, done: top.done }, goal });
});

// ---- This week at a glance (also announced to the owner every Thursday by lib/teamJobs.js) ----
router.get("/weekly", async (req, res) => res.json(await weeklySummary()));

// ---- "Improve this description" (lib/ai.js; free provider, off without AI_API_KEY) ----
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests. Please wait a minute." } });
router.get("/ai", (req, res) => res.json({ enabled: aiEnabled() }));
router.post("/ai/brief", aiLimiter, async (req, res) => {
  try {
    res.json({ text: await improveBrief(req.body?.text, req.body?.lang) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
