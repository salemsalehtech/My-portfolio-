// teamJobs.js — the team workspace's background work, one timer every 15 minutes (started in
// server.js, never in tests or scripts):
//   1. the summary push for notifications held during quiet hours (lib/teamPush.js),
//   2. recurring tasks: a template with repeat weekly / monthly makes its task once that day,
//      after 08:00 Cairo. The template's `lastRun` is claimed with one atomic update first, so two
//      server instances (or two ticks) can never make the same task twice,
//   3. the weekly summary: every Thursday after 16:00 Cairo the owner gets one notification;
//      the numbers themselves are worked out live by weeklySummary() (GET /api/admin/team/weekly).
const { TeamTemplate, TeamTask, TeamProject, TeamSettings, TeamStandup, TeamMember } = require("./mongo");
const { cairoDate, cairoHour, cairoWeekday, addDays } = require("./dates");
const { flushHeld } = require("./teamPush");

// Required lazily: lib/team.js needs this file's neighbours, and notify() lives there.
const team = () => require("./team");

async function runRecurring() {
  if (cairoHour() < 8) return;
  const today = cairoDate();
  const weekday = cairoWeekday();
  const dayOfMonth = Number(today.slice(8, 10));
  const due = await TeamTemplate.find({
    "repeat.lastRun": { $ne: today },
    $or: [
      { "repeat.every": "weekly", "repeat.weekday": weekday },
      { "repeat.every": "monthly", "repeat.monthDay": dayOfMonth },
    ],
  }).lean();
  for (const t of due) {
    const claimed = await TeamTemplate.updateOne({ _id: t._id, "repeat.lastRun": { $ne: today } }, { "repeat.lastRun": today });
    if (!claimed.modifiedCount) continue; // another tick got it
    const project = await TeamProject.findOne({ _id: t.repeat.project, status: "active" }).select("members").lean();
    if (!project) continue;
    const assignee = t.repeat.assignee && project.members.some((m) => String(m) === String(t.repeat.assignee)) ? t.repeat.assignee : null;
    const task = await TeamTask.create({
      project: project._id, title: t.title, description: t.description, priority: t.priority, assignee,
      steps: t.steps.map((s) => ({ text: s.text })), criteria: t.criteria.map((c) => ({ text: c.text })),
      dueDate: addDays(today, t.repeat.dueInDays),
    });
    const { logActivity, notify } = team();
    logActivity({ project: project._id, task: task._id, action: "task_created", detail: task.title });
    if (assignee) notify({ to: assignee, kind: "assigned", task: task._id, project: project._id, detail: task.title });
  }
}

// The last 7 days: finished per member, late, sent back, open help / time requests, standups.
async function weeklySummary() {
  const today = cairoDate();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const active = await TeamProject.find({ status: "active" }).distinct("_id");
  const [done, open, standups, members] = await Promise.all([
    TeamTask.find({ status: "done", completedAt: { $gte: since } }).select("assignee title returnedCount dueDate completedAt").lean(),
    TeamTask.find({ project: { $in: active }, status: { $ne: "done" } }).select("assignee title dueDate helpNote extensionRequest").lean(),
    TeamStandup.countDocuments({ date: { $gt: addDays(today, -7) } }),
    TeamMember.find({ active: true, pending: false }).select("name").lean(),
  ]);
  const perMember = members.map((m) => {
    const id = String(m._id);
    return {
      member: { id, name: m.name },
      done: done.filter((t) => String(t.assignee) === id).length,
      late: open.filter((t) => String(t.assignee) === id && t.dueDate && t.dueDate < today).length,
    };
  }).sort((a, b) => b.done - a.done);
  return {
    from: addDays(today, -7), to: today,
    done: done.length,
    firstTime: done.filter((t) => !t.returnedCount).length,
    late: open.filter((t) => t.dueDate && t.dueDate < today).length,
    help: open.filter((t) => t.helpNote).map((t) => ({ id: String(t._id), title: t.title })),
    extensions: open.filter((t) => t.extensionRequest).map((t) => ({ id: String(t._id), title: t.title })),
    standups,
    perMember,
  };
}

async function announceWeekly() {
  if (cairoWeekday() !== 4 || cairoHour() < 16) return;
  const today = cairoDate();
  const settings = await TeamSettings.findOneAndUpdate(
    { weeklySentOn: { $ne: today } }, { weeklySentOn: today }, { upsert: false }
  );
  if (!settings) {
    if (await TeamSettings.exists({})) return; // already sent today
    await TeamSettings.create({ weeklySentOn: today });
  }
  team().notify({ to: null, kind: "weekly", detail: today });
}

async function tick() {
  for (const job of [flushHeld, runRecurring, announceWeekly]) {
    await job().catch((err) => console.error(`Team job ${job.name} failed:`, err.message));
  }
}

function startTeamJobs() {
  const timer = setInterval(tick, 15 * 60 * 1000);
  timer.unref();
  setTimeout(tick, 60 * 1000).unref();
  return timer;
}

module.exports = { startTeamJobs, weeklySummary, runRecurring };
