// teamScores.js — points, badges, star of the week and the team goal, all worked out from the
// tasks themselves (nothing extra is stored, so the numbers can never drift from the work).
//
// Points for each task approved in the period (owner decision 2026-11-08: by the work delivered,
// its quality and creativity, manners, and extra for going beyond the task):
//   10 approved · +5 on time · +5 approved first time (never sent back) · +2 high / +4 urgent
//   + rating: quality + creativity + conduct (3–15) · + bonus × 5 (0–15) · +1 per standup posted.
// Asking for help or for more time never costs points.
// The ranking and ratings are the owner's only (routes/adminTeam.js); members see their badges,
// the thank-you notes and the shared goal — never a rank or a score (routes/team.js).
const { TeamTask, TeamStandup, TeamKudos, TeamMember, TeamSettings } = require("./mongo");
const { cairoDate } = require("./dates");

const PRIORITY_POINTS = { low: 0, normal: 0, high: 2, urgent: 4 };

// "2026-11" → the first moment of that month and of the next one (Cairo, UTC+2 — close enough for monthly totals).
function monthBounds(month) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, -2));
  const end = new Date(Date.UTC(y, m, 1, -2));
  return [start, end];
}
const currentMonth = () => cairoDate().slice(0, 7);

function taskPoints(t) {
  const onTime = !t.dueDate || cairoDate(t.completedAt) <= t.dueDate;
  const firstTime = !t.returnedCount;
  const r = t.rating;
  return {
    onTime, firstTime,
    points: 10 + (onTime ? 5 : 0) + (firstTime ? 5 : 0) + (PRIORITY_POINTS[t.priority] || 0)
      + (r ? r.quality + r.creativity + r.conduct + r.bonus * 5 : 0),
  };
}

// Totals per member for approved work between two dates, best first.
async function scoresBetween(start, end) {
  const [tasks, standups, members] = await Promise.all([
    TeamTask.find({ status: "done", assignee: { $ne: null }, completedAt: { $gte: start, $lt: end } })
      .select("assignee dueDate completedAt returnedCount priority rating").lean(),
    TeamStandup.aggregate([
      { $match: { date: { $gte: cairoDate(start), $lt: cairoDate(end) } } },
      { $group: { _id: "$member", n: { $sum: 1 } } },
    ]),
    TeamMember.find({ pending: false }).select("name specialty active").lean(),
  ]);
  const rows = new Map(members.map((m) => [String(m._id), {
    member: { id: String(m._id), name: m.name, specialty: m.specialty, active: m.active },
    points: 0, done: 0, onTime: 0, firstTime: 0, rated: 0, ratingSum: 0, bonus: 0, standups: 0,
  }]));
  for (const t of tasks) {
    const row = rows.get(String(t.assignee));
    if (!row) continue;
    const p = taskPoints(t);
    row.points += p.points;
    row.done += 1;
    row.onTime += p.onTime ? 1 : 0;
    row.firstTime += p.firstTime ? 1 : 0;
    if (t.rating) { row.rated += 1; row.ratingSum += (t.rating.quality + t.rating.creativity + t.rating.conduct) / 3; row.bonus += t.rating.bonus; }
  }
  for (const s of standups) {
    const row = rows.get(String(s._id));
    if (row) { row.standups = s.n; row.points += s.n; }
  }
  return [...rows.values()]
    .filter((r) => r.member.active || r.done > 0)
    .map(({ ratingSum, ...r }) => ({ ...r, avgRating: r.rated ? Math.round((ratingSum / r.rated) * 10) / 10 : null }))
    .sort((a, b) => b.points - a.points || b.done - a.done);
}

// Badges a member has earned (all time). Only good news — there are no "negative" badges.
const BADGES = [
  { key: "first", test: (s) => s.done >= 1 },
  { key: "ten", test: (s) => s.done >= 10 },
  { key: "fifty", test: (s) => s.done >= 50 },
  { key: "onTime", test: (s) => s.onTime >= 10 },
  { key: "firstTime", test: (s) => s.firstTime >= 5 },
  { key: "creative", test: (s) => s.creative >= 3 },
  { key: "extraMile", test: (s) => s.bonus >= 1 },
  { key: "standup", test: (s) => s.standups >= 20 },
  { key: "star", test: (s) => s.stars >= 1 },
];
// Badges for several members at once: three queries in total, however many members there are.
// Returns a Map of member id → badge keys.
async function badgesForMany(memberIds) {
  const ids = memberIds.map(String);
  const [tasks, standups, stars] = await Promise.all([
    TeamTask.find({ assignee: { $in: ids }, status: "done" }).select("assignee dueDate completedAt returnedCount rating").lean(),
    TeamStandup.aggregate([{ $match: { member: { $in: ids.map((id) => new TeamStandup.base.Types.ObjectId(id)) } } }, { $group: { _id: "$member", n: { $sum: 1 } } }]),
    TeamKudos.aggregate([{ $match: { member: { $in: ids.map((id) => new TeamKudos.base.Types.ObjectId(id)) }, star: true } }, { $group: { _id: "$member", n: { $sum: 1 } } }]),
  ]);
  const count = (rows) => new Map(rows.map((r) => [String(r._id), r.n]));
  const standupsBy = count(standups);
  const starsBy = count(stars);
  const stats = new Map(ids.map((id) => [id, { done: 0, onTime: 0, firstTime: 0, creative: 0, bonus: 0, standups: standupsBy.get(id) || 0, stars: starsBy.get(id) || 0 }]));
  for (const t of tasks) {
    const s = stats.get(String(t.assignee));
    const p = taskPoints(t);
    s.done += 1;
    s.onTime += p.onTime ? 1 : 0;
    s.firstTime += p.firstTime ? 1 : 0;
    if (t.rating?.creativity === 5) s.creative += 1;
    if (t.rating?.bonus) s.bonus += 1;
  }
  return new Map(ids.map((id) => [id, BADGES.filter((b) => b.test(stats.get(id))).map((b) => b.key)]));
}
const badgesFor = async (memberId) => (await badgesForMany([memberId])).get(String(memberId));

// The shared monthly goal: how many tasks the whole team finished this month vs the target.
async function teamGoal() {
  const settings = await TeamSettings.findOne().select("goalTarget goalLabel").lean();
  if (!settings?.goalTarget) return null;
  const [start, end] = monthBounds(currentMonth());
  const done = await TeamTask.countDocuments({ status: "done", completedAt: { $gte: start, $lt: end } });
  return { target: settings.goalTarget, label: settings.goalLabel, done };
}

const lastDays = (days) => [new Date(Date.now() - days * 24 * 60 * 60 * 1000), new Date()];

module.exports = { scoresBetween, badgesFor, badgesForMany, teamGoal, monthBounds, currentMonth, lastDays };
