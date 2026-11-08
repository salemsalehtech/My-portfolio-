// recurring.test.js — a repeating template makes exactly one task on its day, even when several
// ticks of the job run at once. The Cairo clock is pinned to 10:00 so the test doesn't depend on
// the hour it runs at.
const { useTestDb } = require("./helpers");
useTestDb("team_jobs_test");

const dates = require("../src/lib/dates");
dates.cairoHour = () => 10; // before lib/teamJobs.js reads it
const mongoose = require("mongoose");
const { connectMongo, TeamMember, TeamProject, TeamTemplate, TeamTask } = require("../src/lib/mongo");
const { runRecurring } = require("../src/lib/teamJobs");

(async () => {
  await connectMongo();
  await mongoose.connection.db.dropDatabase();
  const m = await TeamMember.create({ username: "omar", name: "Omar", passwordHash: "x" });
  const p = await TeamProject.create({ name: "P", members: [m._id] });
  const today = dates.cairoWeekday();
  await TeamTemplate.create({ name: "Weekly", title: "Report", repeat: { every: "weekly", weekday: today, project: p._id, assignee: m._id, dueInDays: 2 } });
  await TeamTemplate.create({ name: "Other day", title: "Never today", repeat: { every: "weekly", weekday: (today + 1) % 7, project: p._id } });
  await Promise.all([runRecurring(), runRecurring(), runRecurring()]);
  await runRecurring();
  const made = await TeamTask.find({ title: "Report" });
  const wrong = await TeamTask.countDocuments({ title: "Never today" });
  const ok = made.length === 1 && String(made[0].assignee) === String(m._id)
    && made[0].dueDate === dates.addDays(dates.cairoDate(), 2) && wrong === 0;
  console.log(`${ok ? "PASS" : "FAIL"}  recurring: one task, right assignee and due date, other weekday skipped`);
  console.log(`\n${ok ? 1 : 0} passed, ${ok ? 0 : 1} failed`);
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  process.exitCode = ok ? 0 : 1;
})().catch((err) => { console.error(err); process.exit(1); });
