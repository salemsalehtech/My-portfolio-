// adminCircles.js — the owner's side of the savings circles (/api/admin/circles, login required —
// mounted behind requireAuth in app.js). Members use routes/circles.js.
//
//   - circles: create (draft), edit settings + who holds which month, start, finish, clone
//     ("new circle with the same members"), delete; the full statement of a circle
//   - payments: review screenshots, confirm / reject, record a cash payment, delete
//   - payouts: mark a month's money as handed over (the member then confirms receiving it)
//   - members: accounts (create, edit, private notes + guarantor, approve sign-ups, disable,
//     reset password, delete), their commitment record, the waiting list
//   - invite links, early-turn requests, the activity log, notifications, payment info
const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { Circle, CircleMember, CircleInvite, CirclePayment, CircleRequest, CircleLog, CircleNotification, CircleSettings } = require("../lib/mongo");
const { cairoDate, normalizePhone, monthDate, slotsProblem, buildStatement, commitmentOf, logCircle, notifyCircle } = require("../lib/circles");
const { newInviteToken, hashInviteToken } = require("../lib/team");
const { vapid, saveSubscription } = require("../lib/push");

const router = express.Router();
const isId = (id) => mongoose.isValidObjectId(id);
// 0.3333 → exactly 1/3 (any k/d with d up to 12), so three thirds of a month add up to the pot.
const snapShare = (share) => {
  for (let d = 1; d <= 12; d++) {
    const k = Math.round(share * d);
    if (k > 0 && Math.abs(k / d - share) < 0.0006) return k / d;
  }
  return Math.round(share * 10000) / 10000;
};

// Mongoose errors as one readable sentence; a taken phone number gets its own message.
async function saving(res, work) {
  try {
    return await work();
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "This phone number already has an account" });
    if (err.name === "ValidationError") return res.status(400).json({ error: Object.values(err.errors)[0].message });
    throw err;
  }
}

// ---- Circles ----
const CIRCLE_FIELDS = ["name", "shareAmount", "startMonth", "payDay", "payoutDay"];
const only = (body, fields) => Object.fromEntries(fields.filter((f) => body && f in body).map((f) => [f, body[f]]));

// The list, with this month's progress for every started circle.
router.get("/", async (req, res) => {
  const circles = await Circle.find().sort({ status: 1, startMonth: -1 });
  const payments = await CirclePayment.find({ circle: { $in: circles.map((c) => c._id) } }).select("circle member month amount status createdAt");
  res.json(circles.map((c) => {
    const st = buildStatement(c, payments.filter((p) => String(p.circle) === c.id));
    const m = st.currentMonth;
    return {
      ...c.toJSON(), slots: undefined, remindedAt: undefined,
      months: c.slots.length, members: st.members.length, pot: st.pot, currentMonth: m,
      paidThisMonth: st.members.filter((x) => x.dues[m]?.state === "paid").length,
      lateNow: st.members.filter((x) => x.lateCount > 0).length,
      toReview: payments.filter((p) => String(p.circle) === c.id && p.status === "pending").length,
      endMonth: c.slots.length ? monthDate(c.startMonth, c.slots.length - 1, 1).slice(0, 7) : c.startMonth,
    };
  }));
});

router.post("/", (req, res) => saving(res, async () => {
  const circle = await Circle.create({ ...only(req.body, CIRCLE_FIELDS), status: "draft" });
  logCircle({ circle: circle._id, action: "created", detail: circle.name });
  res.status(201).json(circle);
}));

// GET /:id — the circle with its members, the full statement, payments (no screenshots), the
// open requests and the latest log lines.
router.get("/:id", async (req, res) => {
  const circle = isId(req.params.id) && await Circle.findById(req.params.id).populate("slots.holders.member", "name phone active").populate("helpers", "name phone");
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  const [payments, requests, log] = await Promise.all([
    CirclePayment.find({ circle: circle._id }).sort({ createdAt: -1 }),
    CircleRequest.find({ circle: circle._id }).populate("member", "name").sort({ createdAt: -1 }),
    CircleLog.find({ circle: circle._id }).sort({ createdAt: -1 }).limit(80),
  ]);
  res.json({ circle, statement: buildStatement(circle, payments), payments, requests, log });
});

// PUT /:id { name, shareAmount, startMonth, payDay, payoutDay, slots: [[{member, share}]], helpers }
// The amounts and dates are fixed once a circle starts; who holds a month can still change for
// months whose money hasn't been handed over yet.
router.put("/:id", (req, res) => saving(res, async () => {
  const circle = isId(req.params.id) && await Circle.findById(req.params.id);
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  const data = only(req.body, CIRCLE_FIELDS);
  if (circle.status !== "draft") for (const f of ["shareAmount", "startMonth", "payDay"]) delete data[f];
  circle.set(data);

  if (Array.isArray(req.body?.slots)) {
    const slots = req.body.slots.slice(0, 120).map((holders) => ({
      holders: (Array.isArray(holders) ? holders : []).slice(0, 10).filter((h) => isId(h?.member))
        .map((h) => {
          const share = Number(h.share);
          return { member: h.member, share: share > 0 && share <= 1 ? snapShare(share) : 1 };
        }),
    }));
    const ids = [...new Set(slots.flatMap((s) => s.holders.map((h) => String(h.member))))];
    const found = await CircleMember.countDocuments({ _id: { $in: ids }, pending: false });
    if (found !== ids.length) return res.status(400).json({ error: "Every person must be an approved member" });
    if (circle.status !== "draft") {
      if (slots.length !== circle.slots.length) return res.status(400).json({ error: "The number of months can't change after the circle starts" });
      // Keep the hand-over / receipt marks, and refuse to move a month that was already paid out.
      for (const [i, slot] of circle.slots.entries()) {
        const paidOut = slot.holders.some((h) => h.handedAt);
        const same = JSON.stringify(slot.holders.map((h) => [String(h.member), h.share])) === JSON.stringify(slots[i].holders.map((h) => [String(h.member), h.share]));
        if (paidOut && !same) return res.status(400).json({ error: `Month ${i + 1} was already paid out — it can't change` });
        if (same) slots[i].holders = slot.holders;
      }
      const problem = slotsProblem({ slots });
      if (problem) return res.status(400).json({ error: problem });
    }
    circle.slots = slots;
  }
  if (Array.isArray(req.body?.helpers)) circle.helpers = req.body.helpers.filter(isId).slice(0, 5);
  await circle.save();
  logCircle({ circle: circle._id, action: "edited", detail: circle.name });
  res.json(circle);
}));

// POST /:id/start — checks the months and tells every member.
router.post("/:id/start", async (req, res) => {
  const circle = isId(req.params.id) && await Circle.findById(req.params.id);
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  if (circle.status !== "draft") return res.status(400).json({ error: "This circle has already started" });
  const problem = slotsProblem(circle);
  if (problem) return res.status(400).json({ error: problem });
  circle.status = "active";
  await circle.save();
  const members = [...new Set(circle.slots.flatMap((s) => s.holders.map((h) => String(h.member))))];
  for (const m of members) notifyCircle({ to: m, kind: "added", circle: circle._id, detail: circle.name, url: "/gam3eya" });
  logCircle({ circle: circle._id, action: "started", detail: `${members.length} members · ${circle.slots.length} months` });
  res.json(circle);
});

router.post("/:id/finish", async (req, res) => {
  const circle = isId(req.params.id) && await Circle.findByIdAndUpdate(req.params.id, { status: "finished" }, { new: true });
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  logCircle({ circle: circle._id, action: "finished", detail: circle.name });
  res.json(circle);
});

// POST /:id/clone — a new draft with the same members, months and amount, starting the month
// after this one ends.
router.post("/:id/clone", async (req, res) => {
  const circle = isId(req.params.id) && await Circle.findById(req.params.id);
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  const copy = await Circle.create({
    name: `${circle.name} (2)`.slice(0, 80),
    shareAmount: circle.shareAmount,
    startMonth: monthDate(circle.startMonth, Math.max(circle.slots.length, 1), 1).slice(0, 7),
    payDay: circle.payDay,
    payoutDay: circle.payoutDay,
    slots: circle.slots.map((s) => ({ holders: s.holders.map((h) => ({ member: h.member, share: h.share })) })),
    helpers: circle.helpers,
    status: "draft",
  });
  logCircle({ circle: copy._id, action: "created", detail: `copy of ${circle.name}` });
  res.status(201).json(copy);
});

router.delete("/:id", async (req, res) => {
  if (isId(req.params.id)) {
    const circle = await Circle.findByIdAndDelete(req.params.id);
    await Promise.all([CirclePayment.deleteMany({ circle: req.params.id }), CircleRequest.deleteMany({ circle: req.params.id }), CircleLog.deleteMany({ circle: req.params.id })]);
    if (circle) logCircle({ action: "deleted", detail: circle.name });
  }
  res.status(204).end();
});

// ---- Payments ----
router.get("/payments/:id/proof", async (req, res) => {
  const payment = isId(req.params.id) && await CirclePayment.findById(req.params.id).select("+proof.data");
  if (!payment || !payment.proof?.size) return res.status(404).json({ error: "Not found" });
  res.set({ "Content-Type": payment.proof.contentType, "Cache-Control": "private, max-age=3600" });
  res.send(payment.proof.data);
});

// POST /:id/payments { member, month, amount, method, note } — a payment the owner received
// himself (e.g. cash); confirmed straight away.
router.post("/:id/payments", (req, res) => saving(res, async () => {
  const circle = isId(req.params.id) && await Circle.findById(req.params.id);
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  const month = Number(req.body?.month);
  if (!Number.isInteger(month) || month < 0 || month >= circle.slots.length) return res.status(400).json({ error: "Choose the month" });
  if (!isId(req.body?.member) || !circle.slots.some((s) => s.holders.some((h) => String(h.member) === String(req.body.member)))) {
    return res.status(400).json({ error: "This person is not in the circle" });
  }
  const payment = await CirclePayment.create({
    circle: circle._id, member: req.body.member, month, amount: req.body?.amount, method: req.body?.method || "cash",
    note: req.body?.note, status: "confirmed", reviewedBy: "owner", reviewedAt: new Date(),
  });
  const member = await CircleMember.findById(payment.member).select("name");
  notifyCircle({ to: payment.member, kind: "confirmed", circle: circle._id, detail: `${payment.amount} — ${circle.name}`, url: "/gam3eya" });
  logCircle({ circle: circle._id, action: "payment_recorded", detail: `${member?.name}: ${payment.amount} (${payment.method}) · month ${month + 1}` });
  res.status(201).json(payment);
}));

// POST /payments/:id/review { decision: "confirm" | "reject", reason }
router.post("/payments/:id/review", async (req, res) => {
  const payment = isId(req.params.id) && await CirclePayment.findById(req.params.id).populate("member", "name").populate("circle", "name");
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  const confirm = req.body?.decision === "confirm";
  const reason = String(req.body?.reason ?? "").trim();
  if (!confirm && !reason) return res.status(400).json({ error: "Write why the payment is rejected" });
  payment.set({ status: confirm ? "confirmed" : "rejected", rejectReason: confirm ? "" : reason, reviewedBy: "owner", reviewedAt: new Date() });
  await payment.save();
  notifyCircle({ to: payment.member._id, kind: confirm ? "confirmed" : "rejected", circle: payment.circle._id, detail: confirm ? `${payment.amount} — ${payment.circle.name}` : reason, url: "/gam3eya" });
  logCircle({ circle: payment.circle._id, action: confirm ? "payment_confirmed" : "payment_rejected", detail: `${payment.member.name}: ${payment.amount} · month ${payment.month + 1}${confirm ? "" : ` · ${reason}`}` });
  res.json(payment);
});
router.delete("/payments/:id", async (req, res) => {
  const payment = isId(req.params.id) && await CirclePayment.findByIdAndDelete(req.params.id).populate("member", "name");
  if (payment) logCircle({ circle: payment.circle, action: "payment_deleted", detail: `${payment.member?.name}: ${payment.amount} · month ${payment.month + 1}` });
  res.status(204).end();
});

// Every payment waiting for review, across all circles (the inbox).
router.get("/inbox/all", async (req, res) => {
  const [payments, requests] = await Promise.all([
    CirclePayment.find({ status: "pending" }).populate("member", "name phone").populate("circle", "name").sort({ createdAt: 1 }),
    CircleRequest.find({ status: "open" }).populate("member", "name phone").populate("circle", "name").sort({ createdAt: 1 }),
  ]);
  res.json({ payments, requests });
});

// ---- Payouts ----
// POST /:id/payouts/:month/:memberId { handed: true|false }
router.post("/:id/payouts/:month/:memberId", async (req, res) => {
  const circle = isId(req.params.id) && await Circle.findById(req.params.id);
  const holder = circle?.slots[Number(req.params.month)]?.holders.find((h) => String(h.member) === req.params.memberId);
  if (!holder) return res.status(404).json({ error: "Not found" });
  const handed = Boolean(req.body?.handed);
  holder.handedAt = handed ? holder.handedAt || new Date() : null;
  if (!handed) holder.receivedAt = null;
  await circle.save();
  const member = await CircleMember.findById(holder.member).select("name");
  const amount = Math.round(circle.shareAmount * circle.slots.length * holder.share);
  if (handed) notifyCircle({ to: holder.member, kind: "handed", circle: circle._id, detail: `${amount} — ${circle.name}`, url: "/gam3eya" });
  logCircle({ circle: circle._id, action: handed ? "payout_handed" : "payout_unmarked", detail: `${member?.name}: ${amount} · month ${Number(req.params.month) + 1}` });
  res.json(circle);
});

// ---- Requests ("I need my turn early") ----
router.post("/requests/:id", async (req, res) => {
  const status = ["accepted", "declined"].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: "Choose accept or decline" });
  const request = isId(req.params.id) && await CircleRequest.findByIdAndUpdate(req.params.id, { status, reply: String(req.body?.reply ?? "").slice(0, 500) }, { new: true }).populate("member", "name").populate("circle", "name");
  if (!request) return res.status(404).json({ error: "Request not found" });
  notifyCircle({ to: request.member._id, kind: "answered", circle: request.circle._id, detail: request.reply || (status === "accepted" ? "Accepted" : "Declined"), url: "/gam3eya" });
  logCircle({ circle: request.circle._id, action: `request_${status}`, detail: `${request.member.name}: ${request.reason}` });
  res.json(request);
});

// ---- Members ----
router.get("/members/all", async (req, res) => {
  const members = await CircleMember.find().sort({ pending: -1, name: 1 });
  const record = await commitmentOf(members.map((m) => m._id));
  res.json(members.map((m) => ({ ...m.toJSON(), record: record[m.id] })));
});
const MEMBER_FIELDS = ["name", "notes", "guarantorName", "guarantorPhone", "active"];
router.post("/members", (req, res) => saving(res, async () => {
  const password = String(req.body?.password ?? "");
  if (password.length < 8 || password.length > 100) return res.status(400).json({ error: "The password must be 8 to 100 characters" });
  const member = await CircleMember.create({
    ...only(req.body, MEMBER_FIELDS), phone: normalizePhone(req.body?.phone),
    passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true,
  });
  res.status(201).json(member);
}));
router.put("/members/:id", (req, res) => saving(res, async () => {
  const data = only(req.body, MEMBER_FIELDS);
  if ("phone" in (req.body || {})) data.phone = normalizePhone(req.body.phone);
  const member = isId(req.params.id) && await CircleMember.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json(member);
}));
router.post("/members/:id/approve", async (req, res) => {
  const member = isId(req.params.id) && await CircleMember.findByIdAndUpdate(req.params.id, { pending: false }, { new: true });
  if (!member) return res.status(404).json({ error: "Member not found" });
  logCircle({ action: "member_approved", detail: member.name });
  res.json(member);
});
router.post("/members/:id/password", async (req, res) => {
  const password = String(req.body?.password ?? "");
  if (password.length < 8 || password.length > 100) return res.status(400).json({ error: "The password must be 8 to 100 characters" });
  const member = isId(req.params.id) && await CircleMember.findByIdAndUpdate(req.params.id, { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true }, { new: true });
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json(member);
});
// A member who is (or was) in a circle can't be deleted — disable them instead.
router.delete("/members/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(204).end();
  if (await Circle.exists({ "slots.holders.member": req.params.id })) {
    return res.status(400).json({ error: "This member is in a circle — disable the account instead" });
  }
  await CircleMember.findByIdAndDelete(req.params.id);
  res.status(204).end();
});
router.post("/members/:id/waitlist", async (req, res) => {
  const member = isId(req.params.id) && await CircleMember.findByIdAndUpdate(req.params.id, { "waitlist.on": false }, { new: true });
  if (!member) return res.status(404).json({ error: "Member not found" });
  res.json(member);
});

// ---- Invite links ----
router.get("/invites/all", async (req, res) => {
  const [invites, joined] = await Promise.all([
    CircleInvite.find().sort({ createdAt: -1 }).limit(50),
    CircleMember.find({ invite: { $ne: null } }).select("name invite"),
  ]);
  const now = new Date();
  res.json(invites.map((i) => ({
    ...i.toJSON(),
    state: i.revoked ? "revoked" : i.uses >= i.maxUses ? "used" : i.expiresAt <= now ? "expired" : "active",
    members: joined.filter((m) => String(m.invite) === i.id).map((m) => m.name),
  })));
});
router.post("/invites", async (req, res) => {
  const maxUses = Math.min(50, Math.max(1, parseInt(req.body?.maxUses, 10) || 1));
  const days = Math.min(30, Math.max(1, parseInt(req.body?.days, 10) || 7));
  const token = newInviteToken();
  const invite = await CircleInvite.create({ tokenHash: hashInviteToken(token), label: req.body?.label, maxUses, expiresAt: new Date(Date.now() + days * 864e5) });
  res.status(201).json({ invite: { ...invite.toJSON(), tokenHash: undefined, state: "active", members: [] }, token });
});
router.delete("/invites/:id", async (req, res) => {
  if (isId(req.params.id)) await CircleInvite.updateOne({ _id: req.params.id }, { revoked: true });
  res.status(204).end();
});

// ---- Payment info, notifications, phone notifications, log ----
router.get("/settings/pay", async (req, res) => {
  const s = await CircleSettings.findOne();
  res.json({ instapay: s?.instapay || "", instapayLink: s?.instapayLink || "", vodafone: s?.vodafone || "", payNote: s?.payNote || "" });
});
router.put("/settings/pay", (req, res) => saving(res, async () => {
  const s = (await CircleSettings.findOne()) || new CircleSettings();
  s.set(only(req.body, ["instapay", "instapayLink", "vodafone", "payNote"]));
  await s.save();
  res.json({ instapay: s.instapay, instapayLink: s.instapayLink, vodafone: s.vodafone, payNote: s.payNote });
}));

router.get("/notifications/all", async (req, res) => {
  const [items, unread, pending] = await Promise.all([
    CircleNotification.find({ recipient: null }).sort({ createdAt: -1 }).limit(30),
    CircleNotification.countDocuments({ recipient: null, read: false }),
    CirclePayment.countDocuments({ status: "pending" }),
  ]);
  // "Reminders" for the owner: payments waiting for review (shown first in the bell).
  res.json({ items, unread, reminders: pending ? [{ kind: "review", count: pending }] : [] });
});
router.post("/notifications/read", async (req, res) => {
  await CircleNotification.updateMany({ recipient: null, read: false }, { read: true });
  res.status(204).end();
});
router.get("/push/key", async (req, res) => res.json(await vapid()));
router.post("/push/subscribe", async (req, res) => {
  if (!(await saveSubscription(null, req.body))) return res.status(400).json({ error: "Invalid subscription" });
  res.status(201).json({ ok: true });
});

router.get("/log/all", async (req, res) => {
  res.json(await CircleLog.find().populate("circle", "name").sort({ createdAt: -1 }).limit(150));
});

module.exports = router;
