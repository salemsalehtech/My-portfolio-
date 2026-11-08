// teamPush.js — phone notifications (Web Push, lib/push.js) for the team workspace, with quiet
// hours: nothing buzzes between 22:00 and 09:00 Cairo time or on Fridays. A notification made in
// quiet hours is saved with `pushed: false` (it is in the bell right away) and one summary push
// per person goes out when the quiet hours end ("You have 3 new notifications").
// notify() in lib/team.js calls pushNow(); lib/teamJobs.js runs flushHeld() every 15 minutes.
const { TeamNotification } = require("./mongo");
const { cairoHour, cairoWeekday } = require("./dates");
const { sendPush } = require("./push");

const isQuietTime = () => {
  const hour = cairoHour();
  return cairoWeekday() === 5 || hour >= 22 || hour < 9;
};

// Short Arabic lines for the lock screen (the bell itself shows the full text in the member's language).
const TEXT = {
  assigned: (a, d) => `${a || "المدير"} أسند إليك «${d}»`,
  approved: (a, d) => `تمت الموافقة على «${d}»`,
  returned: (a, d) => `«${d}» رجعت لك بملاحظات`,
  submitted: (a, d) => `${a} سلّم «${d}» للمراجعة`,
  comment: (a, d) => `${a || "المدير"} علّق على «${d}»`,
  mention: (a, d) => `${a || "المدير"} ذكرك في «${d}»`,
  reply: (a, d) => `${a || "المدير"} رد على تعليقك في «${d}»`,
  blocker: (a, d) => `${a} عنده عائق: ${d}`,
  help: (a, d) => `${a} محتاج مساعدة في «${d}»`,
  extension: (a, d) => `${a} طالب وقت إضافي لـ «${d}»`,
  extension_ok: (a, d) => `اتمدّ موعد «${d}»`,
  extension_no: (a, d) => `موعد «${d}» زي ما هو`,
  file: (a, d) => `${a || "المدير"} أرفق ملفًا في «${d}»`,
  kudos: (a, d) => `رسالة تقدير: ${d}`,
  star: () => "مبروك! انت نجم الأسبوع",
  claimed: (a, d) => `${a} أخد «${d}»`,
  rules: () => "قواعد الفريق اتحدّثت — اقرأها ووافق",
  weekly: () => "ملخص الأسبوع جاهز",
};
const urlFor = (to) => (to ? "/team" : "/admin/team");

// Sends the push for one notification now, unless it is quiet time (then it waits for the summary).
// Returns whether it was sent, so the caller can store `pushed`.
function pushNow({ to, kind, actor, detail }) {
  if (isQuietTime()) return false;
  const body = (TEXT[kind] || ((a, d) => `${a} ${d}`))(actor, detail);
  sendPush(to, { title: "Salem Saleh Tech", body, url: urlFor(to) }); // never throws
  return true;
}

// After quiet hours: one summary push per person for what waited, then mark it all as pushed.
async function flushHeld() {
  if (isQuietTime()) return;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const held = await TeamNotification.aggregate([
    { $match: { pushed: false, read: false, createdAt: { $gte: since } } },
    { $group: { _id: "$recipient", n: { $sum: 1 } } },
  ]);
  await TeamNotification.updateMany({ pushed: false }, { pushed: true });
  await Promise.all(held.map(({ _id: to, n }) =>
    sendPush(to, { title: "Salem Saleh Tech", body: n === 1 ? "عندك إشعار جديد" : `عندك ${n} إشعارات جديدة`, url: urlFor(to) })));
}

module.exports = { pushNow, isQuietTime, flushHeld };
