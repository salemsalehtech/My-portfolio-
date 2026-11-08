// circleReminders.js — sends phone reminders (Web Push) for the savings circles once a day:
//   - a member whose payment is due tomorrow or today, or is late (late: every 3 days),
//   - a member whose turn's money is due tomorrow.
// It checks every hour and only sends between 10:00 and 21:00 Cairo time; each reminder goes once
// (remembered in circle.remindedAt). Members without phone notifications simply see the same
// reminders in the portal (routes/circles.js works them out live). Runs only in server.js.
const { Circle, CirclePayment, PushSubscription } = require("./mongo");
const { buildStatement } = require("./circles");
const { cairoDate, cairoHour, addDays } = require("./dates");
const { sendPush } = require("./push");

async function runOnce() {
  const hour = cairoHour();
  if (hour < 10 || hour > 21) return 0;
  const today = cairoDate();
  const tomorrow = addDays(today, 1);
  const subscribed = new Set((await PushSubscription.find({ member: { $ne: null } }).distinct("member")).map(String));
  if (subscribed.size === 0) return 0;

  let sent = 0;
  const circles = await Circle.find({ status: "active" });
  // One query for every circle's payments instead of one per circle.
  const allPayments = await CirclePayment.find({ circle: { $in: circles.map((c) => c._id) } }).select("circle member month amount status createdAt");
  for (const circle of circles) {
    const payments = allPayments.filter((p) => String(p.circle) === String(circle._id));
    const st = buildStatement(circle, payments, today);
    const once = async (key, memberId, body) => {
      if (circle.remindedAt.get(key) === today) return;
      circle.remindedAt.set(key, today);
      await sendPush(memberId, { title: circle.name, body, url: "/gam3eya" });
      sent += 1;
    };
    for (const m of st.members) {
      if (!subscribed.has(m.member)) continue;
      for (const d of m.dues) {
        const left = d.due - d.paid;
        if (left <= 0 || d.pending >= left) continue;
        if (d.dueDate === tomorrow) await once(`${m.member}:${d.month}:pay1`, m.member, `تذكير: قسط الجمعية ${left} جنيه موعده بكرة`);
        else if (d.dueDate === today) await once(`${m.member}:${d.month}:pay0`, m.member, `النهارده آخر يوم لدفع قسط الجمعية (${left} جنيه)`);
        else if (d.dueDate < today) {
          const daysLate = Math.round((new Date(today) - new Date(d.dueDate)) / 864e5);
          if (daysLate % 3 === 1) await once(`${m.member}:${d.month}:late${daysLate}`, m.member, `قسط الجمعية متأخر ${daysLate} يوم (${left} جنيه)`);
        }
      }
    }
    for (const month of st.months) {
      if (month.payoutDate !== tomorrow) continue;
      for (const h of month.holders) {
        if (subscribed.has(h.member)) await once(`${h.member}:${month.index}:payout`, h.member, `بكرة معاد قبض دورك (${h.amount} جنيه)`);
      }
    }
    if (circle.isModified("remindedAt")) await circle.save();
  }
  return sent;
}

function startCircleReminders() {
  if (process.env.CIRCLE_REMINDERS === "off") return null;
  const tick = () => runOnce().catch((err) => console.error("Circle reminders failed:", err.message));
  const timer = setInterval(tick, 60 * 60 * 1000);
  timer.unref();
  setTimeout(tick, 60 * 1000).unref(); // a first check shortly after start-up
  return timer;
}

module.exports = { startCircleReminders, runOnce };
