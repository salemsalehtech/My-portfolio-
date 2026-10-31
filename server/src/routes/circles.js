// circles.js — the member portal of the savings circles (/api/circle). Members sign up with an
// invite link (phone number + password, then the owner approves) and log in with their phone.
//
// A member sees ONLY their own data in each circle: their months, dues, payments and turns —
// never the other members. They can:
//   - send a payment (amount, method, a screenshot of the transfer, a note) — it waits for the
//     owner (or a helper of that circle) to confirm it,
//   - confirm they received their turn's money after the owner marks it handed over,
//   - ask for an earlier turn, say they want to join the next circle, set a savings goal,
//   - read their notifications and live reminders, and turn on phone notifications.
// A member who is a helper of a circle can also confirm / reject that circle's payments.
const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const { Circle, CircleMember, CircleInvite, CirclePayment, CircleRequest, CircleNotification, CircleSettings, PushSubscription } = require("../lib/mongo");
const { cairoDate, addDays, normalizePhone, buildStatement, logCircle, notifyCircle, signCircleToken, requireCircleMember } = require("../lib/circles");
const { hashInviteToken, usableInvite } = require("../lib/team");
const { readImageUpload } = require("../lib/images");
const { vapid, saveSubscription } = require("../lib/push");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});
const checkPassword = (p) => (p.length < 8 || p.length > 100 ? "The password must be 8 to 100 characters" : null);

// POST /login { phone, password } → { token, member }
router.post("/login", authLimiter, async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password ?? "");
  const member = phone && await CircleMember.findOne({ phone }).select("+passwordHash");
  if (!member || !member.active || !(await bcrypt.compare(password, member.passwordHash))) {
    return res.status(401).json({ error: "Wrong phone number or password" });
  }
  if (member.pending) return res.status(403).json({ error: "Your account is waiting for approval", pending: true });
  member.lastLoginAt = new Date();
  await member.save();
  res.json({ token: signCircleToken(member), member: privateless(member) });
});

// The owner's private notes never go to the member.
const privateless = (m) => { const j = m.toJSON(); delete j.notes; delete j.guarantorName; delete j.guarantorPhone; return j; };

// GET /invites/:token → { valid }
router.get("/invites/:token", authLimiter, async (req, res) => {
  res.json({ valid: Boolean(await CircleInvite.exists({ tokenHash: hashInviteToken(req.params.token), ...usableInvite() })) });
});

// POST /signup { token, name, phone, password } → a pending account.
router.post("/signup", authLimiter, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password ?? "");
  if (!name || name.length > 80) return res.status(400).json({ error: "Write your name (up to 80 characters)" });
  if (!/^\d{8,15}$/.test(phone)) return res.status(400).json({ error: "Write a correct phone number" });
  const problem = checkPassword(password);
  if (problem) return res.status(400).json({ error: problem });
  if (await CircleMember.exists({ phone })) return res.status(400).json({ error: "This phone number already has an account — sign in instead" });
  const invite = await CircleInvite.findOneAndUpdate({ tokenHash: hashInviteToken(req.body?.token), ...usableInvite() }, { $inc: { uses: 1 } }, { new: true });
  if (!invite) return res.status(400).json({ error: "This invite link is no longer valid. Ask for a new one." });
  try {
    const member = await CircleMember.create({ name, phone, passwordHash: await bcrypt.hash(password, 10), pending: true, invite: invite._id });
    notifyCircle({ kind: "signup", actor: member.name });
    logCircle({ actor: member.name, action: "signed_up", detail: member.phone });
    res.status(201).json({ member: { name: member.name, phone: member.phone }, pending: true });
  } catch (err) {
    await CircleInvite.updateOne({ _id: invite._id }, { $inc: { uses: -1 } });
    throw err;
  }
});

// ---- Everything below needs a member token ----
router.use(requireCircleMember);

router.get("/me", (req, res) => res.json(privateless(req.member)));

router.post("/password", async (req, res) => {
  const next = String(req.body?.next ?? "");
  const problem = checkPassword(next);
  if (problem) return res.status(400).json({ error: problem });
  const member = await CircleMember.findById(req.member.id).select("+passwordHash");
  if (!(await bcrypt.compare(String(req.body?.current ?? ""), member.passwordHash))) return res.status(400).json({ error: "The current password is wrong" });
  member.passwordHash = await bcrypt.hash(next, 10);
  member.mustChangePassword = false;
  await member.save();
  res.json(privateless(member));
});

router.use((req, res, next) => {
  if (req.member.mustChangePassword) return res.status(403).json({ error: "Please choose a new password first", mustChangePassword: true });
  next();
});

// PUT /me { goal } — what I'm saving for.
router.put("/me", async (req, res) => {
  req.member.goal = String(req.body?.goal ?? "").slice(0, 120);
  await req.member.save();
  res.json(privateless(req.member));
});

// POST /waitlist { on, note } — "I want to join the next circle".
router.post("/waitlist", async (req, res) => {
  const on = Boolean(req.body?.on);
  req.member.waitlist = { on, note: String(req.body?.note ?? "").slice(0, 300), at: on ? new Date() : null };
  await req.member.save();
  if (on) notifyCircle({ kind: "waitlist", actor: req.member.name, detail: req.member.waitlist.note });
  res.json(privateless(req.member));
});

// GET /pay-info — where to send the money.
router.get("/pay-info", async (req, res) => {
  const s = await CircleSettings.findOne();
  res.json({ instapay: s?.instapay || "", instapayLink: s?.instapayLink || "", vodafone: s?.vodafone || "", payNote: s?.payNote || "" });
});

// The circles I'm in (started or finished), each with ONLY my part of the statement.
async function myCircles(member) {
  const circles = await Circle.find({ status: { $ne: "draft" }, "slots.holders.member": member._id }).sort({ startMonth: -1 });
  const payments = await CirclePayment.find({ circle: { $in: circles.map((c) => c._id) } }).sort({ createdAt: 1 });
  const requests = await CircleRequest.find({ member: member._id, circle: { $in: circles.map((c) => c._id) } }).sort({ createdAt: -1 });
  const me = String(member._id);
  return circles.map((circle) => {
    const own = payments.filter((p) => String(p.circle) === String(circle._id));
    const st = buildStatement(circle, own);
    return {
      id: circle.id, name: circle.name, status: circle.status, shareAmount: circle.shareAmount,
      startMonth: circle.startMonth, payDay: circle.payDay, payoutDay: circle.payoutDay,
      months: circle.slots.length, pot: st.pot, currentMonth: st.currentMonth, today: st.today,
      isHelper: circle.helpers.some((h) => String(h) === me),
      me: st.members.find((m) => m.member === me),
      turns: st.months
        .filter((m) => m.holders.some((h) => h.member === me))
        .map((m) => ({ month: m.index, slotId: m.slotId, payoutDate: m.payoutDate, shared: m.holders.length > 1, ...m.holders.find((h) => h.member === me) })),
      payments: own.filter((p) => String(p.member) === me).map((p) => p.toJSON()),
      requests: requests.filter((r) => String(r.circle) === String(circle._id)),
    };
  });
}
router.get("/circles", async (req, res) => res.json(await myCircles(req.member)));

// Loads a circle I'm in (404 otherwise).
async function myCircle(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ error: "Circle not found" }); return null; }
  const circle = await Circle.findOne({ _id: req.params.id, status: { $ne: "draft" }, "slots.holders.member": req.member._id });
  if (!circle) { res.status(404).json({ error: "Circle not found" }); return null; }
  return circle;
}

// POST /circles/:id/payments { month, amount, method, note, proof: "<base64>" }
router.post("/circles/:id/payments", async (req, res) => {
  const circle = await myCircle(req, res);
  if (!circle) return;
  if (circle.status !== "active") return res.status(400).json({ error: "This circle has finished" });
  const month = Number(req.body?.month);
  if (!Number.isInteger(month) || month < 0 || month >= circle.slots.length) return res.status(400).json({ error: "Choose the month you are paying for" });
  const method = String(req.body?.method || "instapay");
  let proof;
  if (req.body?.proof) {
    const { image, error } = readImageUpload({ data: req.body.proof });
    if (error) return res.status(400).json({ error });
    proof = image;
  } else if (method !== "cash") {
    return res.status(400).json({ error: "Attach a screenshot of the transfer" });
  }
  const payment = await CirclePayment.create({
    circle: circle._id, member: req.member._id, month, amount: req.body?.amount, method, note: req.body?.note, proof,
  });
  const detail = `${payment.amount} — ${circle.name}`;
  notifyCircle({ kind: "submitted", actor: req.member.name, circle: circle._id, detail });
  for (const helper of circle.helpers) if (String(helper) !== String(req.member._id)) notifyCircle({ to: helper, kind: "submitted", actor: req.member.name, circle: circle._id, detail, url: "/gam3eya" });
  logCircle({ circle: circle._id, actor: req.member.name, action: "payment_sent", detail: `${payment.amount} (${method}) · month ${month + 1}` });
  res.status(201).json(payment);
});

// GET /payments/:id — one of my payments (for the receipt).
router.get("/payments/:id", async (req, res) => {
  const payment = mongoose.isValidObjectId(req.params.id) && await CirclePayment.findOne({ _id: req.params.id, member: req.member._id }).populate("circle", "name startMonth payDay");
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  res.json({ ...payment.toJSON(), memberName: req.member.name, memberPhone: req.member.phone });
});

// GET /payments/:id/proof — the screenshot: my own, or any of a circle I help with.
router.get("/payments/:id/proof", async (req, res) => {
  const payment = mongoose.isValidObjectId(req.params.id) && await CirclePayment.findById(req.params.id).select("+proof.data");
  if (!payment || !payment.proof?.size) return res.status(404).json({ error: "Not found" });
  const mine = String(payment.member) === String(req.member._id);
  if (!mine && !(await Circle.exists({ _id: payment.circle, helpers: req.member._id }))) return res.status(404).json({ error: "Not found" });
  res.set({ "Content-Type": payment.proof.contentType, "Cache-Control": "private, max-age=3600" });
  res.send(payment.proof.data);
});

// POST /circles/:id/turns/:month/received — "I received my turn's money".
router.post("/circles/:id/turns/:month/received", async (req, res) => {
  const circle = await myCircle(req, res);
  if (!circle) return;
  const slot = circle.slots[Number(req.params.month)];
  const holder = slot?.holders.find((h) => String(h.member) === String(req.member._id));
  if (!holder) return res.status(404).json({ error: "This is not your turn" });
  if (!holder.handedAt) return res.status(400).json({ error: "The owner hasn't marked this money as handed over yet" });
  if (!holder.receivedAt) {
    holder.receivedAt = new Date();
    await circle.save();
    notifyCircle({ kind: "received", actor: req.member.name, circle: circle._id, detail: circle.name });
    logCircle({ circle: circle._id, actor: req.member.name, action: "payout_received", detail: `month ${Number(req.params.month) + 1}` });
  }
  res.json(await myCircles(req.member));
});

// POST /circles/:id/requests { reason } — ask for an earlier turn.
router.post("/circles/:id/requests", async (req, res) => {
  const circle = await myCircle(req, res);
  if (!circle) return;
  if (await CircleRequest.exists({ circle: circle._id, member: req.member._id, status: "open" })) {
    return res.status(400).json({ error: "You already have an open request in this circle" });
  }
  const request = await CircleRequest.create({ circle: circle._id, member: req.member._id, reason: req.body?.reason });
  notifyCircle({ kind: "request", actor: req.member.name, circle: circle._id, detail: request.reason });
  logCircle({ circle: circle._id, actor: req.member.name, action: "early_request", detail: request.reason });
  res.status(201).json(request);
});

// ---- Helpers: confirm / reject a circle's payments ----
async function helperCircle(req, res) {
  const circle = mongoose.isValidObjectId(req.params.id) && await Circle.findOne({ _id: req.params.id, helpers: req.member._id });
  if (!circle) { res.status(404).json({ error: "Circle not found" }); return null; }
  return circle;
}
router.get("/helper/:id/payments", async (req, res) => {
  const circle = await helperCircle(req, res);
  if (!circle) return;
  res.json(await CirclePayment.find({ circle: circle._id, status: "pending" }).populate("member", "name").sort({ createdAt: 1 }));
});
router.post("/helper/:id/payments/:paymentId", async (req, res) => {
  const circle = await helperCircle(req, res);
  if (!circle) return;
  const payment = mongoose.isValidObjectId(req.params.paymentId) && await CirclePayment.findOne({ _id: req.params.paymentId, circle: circle._id, status: "pending" });
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  const confirm = req.body?.decision === "confirm";
  const reason = String(req.body?.reason ?? "").trim();
  if (!confirm && !reason) return res.status(400).json({ error: "Write why the payment is rejected" });
  payment.set({ status: confirm ? "confirmed" : "rejected", rejectReason: confirm ? "" : reason, reviewedBy: req.member.name, reviewedAt: new Date() });
  await payment.save();
  notifyCircle({ to: payment.member, kind: confirm ? "confirmed" : "rejected", circle: circle._id, detail: confirm ? `${payment.amount} — ${circle.name}` : reason, url: "/gam3eya" });
  logCircle({ circle: circle._id, actor: req.member.name, action: confirm ? "payment_confirmed" : "payment_rejected", detail: `${payment.amount} · month ${payment.month + 1}${confirm ? "" : ` · ${reason}`}` });
  res.json(payment);
});

// ---- Notifications 🔔 + live reminders ----
router.get("/notifications", async (req, res) => {
  const [items, unread, circles] = await Promise.all([
    CircleNotification.find({ recipient: req.member._id }).sort({ createdAt: -1 }).limit(30),
    CircleNotification.countDocuments({ recipient: req.member._id, read: false }),
    myCircles(req.member),
  ]);
  const today = cairoDate();
  const reminders = [];
  for (const c of circles) {
    if (c.status !== "active" || !c.me) continue;
    for (const d of c.me.dues) {
      if (d.state === "late" || d.state === "due") reminders.push({ kind: "pay", circle: c.id, circleName: c.name, month: d.month, date: d.dueDate, amount: d.due - d.paid, when: d.state === "late" ? "late" : d.dueDate === today ? "today" : "soon" });
    }
    for (const t of c.turns) {
      if (!t.receivedAt && t.payoutDate >= today && t.payoutDate <= addDays(today, 3)) reminders.push({ kind: "payout", circle: c.id, circleName: c.name, month: t.month, date: t.payoutDate, amount: t.amount, when: t.payoutDate === today ? "today" : "soon" });
    }
  }
  res.json({ items, unread, reminders });
});
router.post("/notifications/read", async (req, res) => {
  await CircleNotification.updateMany({ recipient: req.member._id, read: false }, { read: true });
  res.status(204).end();
});

// ---- Phone notifications (Web Push) ----
router.get("/push/key", async (req, res) => res.json(await vapid()));
router.post("/push/subscribe", async (req, res) => {
  if (!(await saveSubscription(req.member._id, req.body))) return res.status(400).json({ error: "Invalid subscription" });
  res.status(201).json({ ok: true });
});
router.post("/push/unsubscribe", async (req, res) => {
  await PushSubscription.deleteOne({ endpoint: String(req.body?.endpoint || ""), member: req.member._id });
  res.status(204).end();
});

module.exports = router;
