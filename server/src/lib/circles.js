// circles.js — the rules of a savings circle (جمعية), shared by the owner's routes
// (routes/adminCircles.js), the member portal (routes/circles.js) and the daily reminders.
//
// Money words used here:
//   share     — one "سهم": a member with a full share pays shareAmount every month and receives
//               one month's pot; a part of a share (½, ⅓, ¼ …) pays that part and shares a month
//               with others whose parts add up to one
//   month i   — the i-th month of the circle (0 = startMonth); there are as many months as slots
//   pot       — what the month's holders receive together: shareAmount × number of slots
// Only CONFIRMED payments count as paid. Dates are Cairo dates as "YYYY-MM-DD" strings.
const jwt = require("jsonwebtoken");
const { Circle, CircleMember, CirclePayment, CircleLog, CircleNotification } = require("./mongo");
const { sendPush } = require("./push");
const { cairoDate, addDays } = require("./dates");


// "+20 100-123 4567" / "00201001234567" → "01001234567". Other countries keep their digits.
function normalizePhone(raw) {
  let digits = String(raw ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("20") && digits.length === 12) digits = `0${digits.slice(2)}`;
  return digits.replace(/\D/g, "");
}

// The date of `day` in month i of the circle ("2026-11" + 2 → "2027-01-<day>").
function monthDate(startMonth, i, day) {
  const [y, m] = startMonth.split("-").map(Number);
  const total = y * 12 + (m - 1) + i;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Each member's total shares in a circle: { memberId: 1.5 }.
function sharesByMember(circle) {
  const shares = {};
  for (const slot of circle.slots) {
    for (const h of slot.holders) {
      const id = String(h.member?._id || h.member);
      shares[id] = (shares[id] || 0) + h.share;
    }
  }
  return shares;
}

// A month's pot split between its holders in whole pounds that add up to the pot exactly
// (the pounds left by rounding down go to the biggest remainders).
function splitPot(pot, holders) {
  const raw = holders.map((h) => pot * h.share);
  const amounts = raw.map(Math.floor);
  let left = Math.round(pot * holders.reduce((s, h) => s + h.share, 0)) - amounts.reduce((s, a) => s + a, 0);
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { amounts[i] += 1; left -= 1; } });
  return amounts;
}

// What's wrong with the slots before a circle can start (null = fine).
function slotsProblem(circle) {
  if (circle.slots.length < 2) return "A circle needs at least 2 months (slots)";
  for (const [i, slot] of circle.slots.entries()) {
    const total = slot.holders.reduce((sum, h) => sum + h.share, 0);
    if (Math.abs(total - 1) > 0.001) return `Month ${i + 1}: the parts must add up to one full share`;
    const ids = slot.holders.map((h) => String(h.member?._id || h.member));
    if (new Set(ids).size !== ids.length) return `Month ${i + 1} has the same person twice`;
  }
  return null;
}

// The full picture of one circle: every month with its dates and holders, and every member's
// dues month by month. `payments` = the circle's payments (any status).
function buildStatement(circle, payments, today = cairoDate()) {
  const n = circle.slots.length;
  const pot = circle.shareAmount * n;
  const shares = sharesByMember(circle);
  const months = circle.slots.map((slot, i) => ({
    index: i,
    slotId: String(slot._id),
    dueDate: monthDate(circle.startMonth, i, circle.payDay),
    payoutDate: monthDate(circle.startMonth, i, circle.payoutDay),
    holders: splitPot(pot, slot.holders).map((amount, j) => ({
      member: String(slot.holders[j].member?._id || slot.holders[j].member),
      share: slot.holders[j].share,
      amount,
      handedAt: slot.holders[j].handedAt,
      receivedAt: slot.holders[j].receivedAt,
    })),
  }));

  const members = Object.entries(shares).map(([memberId, share]) => {
    const due = Math.round(circle.shareAmount * share); // whole pounds (⅓ of 1000 → 333)
    const mine = payments.filter((p) => String(p.member?._id || p.member) === memberId);
    const dues = months.map((m) => {
      const ofMonth = mine.filter((p) => p.month === m.index);
      const confirmed = ofMonth.filter((p) => p.status === "confirmed");
      const paid = confirmed.reduce((s, p) => s + p.amount, 0);
      const pending = ofMonth.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
      // Paid on time = the confirmed payments that cover the due were SENT by the due date.
      let onTime = null;
      if (paid >= due) {
        let running = 0;
        const sorted = [...confirmed].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const covering = sorted.find((p) => (running += p.amount) >= due);
        onTime = cairoDate(new Date(covering.createdAt)) <= m.dueDate;
      }
      const state = paid >= due ? "paid"
        : pending > 0 ? "review"
          : today > m.dueDate ? "late"
            : m.dueDate <= addDays(today, 3) ? "due"
              : "upcoming";
      return { month: m.index, dueDate: m.dueDate, due, paid, pending, state, onTime };
    });
    return {
      member: memberId,
      share,
      monthlyDue: due,
      totalToPay: due * n,
      paidSoFar: dues.reduce((s, d) => s + Math.min(d.paid, d.due), 0),
      totalToReceive: Math.round(pot * share),
      lateCount: dues.filter((d) => d.state === "late").length,
      dues,
    };
  });

  const current = months.findIndex((m) => m.dueDate >= today || m.payoutDate >= today);
  return { pot, months, members, currentMonth: current === -1 ? n - 1 : current, today };
}

// A member's record across every started circle: months paid on time, paid late, and still late.
async function commitmentOf(memberIds) {
  const today = cairoDate();
  const circles = await Circle.find({ status: { $ne: "draft" }, "slots.holders.member": { $in: memberIds } });
  const payments = await CirclePayment.find({ circle: { $in: circles.map((c) => c._id) } }).select("circle member month amount status createdAt");
  const record = Object.fromEntries(memberIds.map((id) => [String(id), { onTime: 0, lateButPaid: 0, lateNow: 0, circles: 0 }]));
  for (const circle of circles) {
    const st = buildStatement(circle, payments.filter((p) => String(p.circle) === String(circle._id)), today);
    for (const m of st.members) {
      const r = record[m.member];
      if (!r) continue;
      r.circles += 1;
      for (const d of m.dues) {
        if (d.dueDate > today && d.state !== "paid") continue; // not due yet
        if (d.state === "paid") d.onTime ? (r.onTime += 1) : (r.lateButPaid += 1);
        else if (d.state === "late") r.lateNow += 1;
      }
    }
  }
  return record;
}

// One line in the circle's log. Never breaks the request that wrote it.
function logCircle({ circle = null, actor = "owner", action, detail = "" }) {
  return CircleLog.create({ circle, actor, action, detail: String(detail).slice(0, 300) })
    .catch((err) => console.error("Circle log failed:", err.message));
}

// Push texts (Arabic — the members' language); the portal words the in-app list itself.
const PUSH_TEXT = {
  submitted: (a, d) => `${a} أرسل دفعة: ${d}`,
  confirmed: (a, d) => `تم تأكيد دفعتك ${d}`,
  rejected: (a, d) => `دفعتك لم تُقبل: ${d}`,
  handed: (a, d) => `تم تسليمك مبلغ دورك ${d}`,
  received: (a, d) => `${a} أكد استلام دوره ${d}`,
  request: (a, d) => `${a} طلب دوره بدري: ${d}`,
  answered: (a, d) => `تم الرد على طلبك: ${d}`,
  added: (a, d) => `تمت إضافتك إلى جمعية ${d}`,
  signup: (a) => `${a} سجّل في الجمعيات — وافق على الحساب`,
  waitlist: (a) => `${a} عايز يدخل الجمعية الجاية`,
};

// A notification for the bell (and a push to the phone, if they turned it on).
// `to` = a member id, or null for the owner.
async function notifyCircle({ to = null, kind, actor = "", circle = null, detail = "", url = "" }) {
  try {
    await CircleNotification.create({ recipient: to, kind, actor, circle, detail: String(detail).slice(0, 300) });
    const text = (PUSH_TEXT[kind] || ((a, d) => `${a} ${d}`))(actor, detail);
    await sendPush(to, { title: "الجمعيات", body: text, url: url || (to ? "/gam3eya" : "/admin/circles") });
  } catch (err) {
    console.error("Circle notification failed:", err.message);
  }
}

// Member tokens are signed with their own key, so they can never pass the admin or team checks.
const circleSecret = () => `${process.env.JWT_SECRET}:circle`;
const signCircleToken = (member) => jwt.sign({ sub: member.id, kind: "circle" }, circleSecret(), { expiresIn: "30d" });

async function requireCircleMember(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  let payload;
  try {
    payload = jwt.verify(token, circleSecret());
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  const member = await CircleMember.findById(payload.sub);
  if (!member || !member.active || member.pending) return res.status(401).json({ error: "This account is disabled" });
  req.member = member;
  next();
}

module.exports = {
  cairoDate, addDays, normalizePhone, monthDate, sharesByMember, slotsProblem, buildStatement, commitmentOf,
  logCircle, notifyCircle, signCircleToken, requireCircleMember,
};
