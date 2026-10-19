const express = require("express");
const rateLimit = require("express-rate-limit");
const { Testimonial } = require("../lib/mongo");

// Public routes for testimonials: the list shown on the site (only the visible ones) and the
// feedback form clients fill in from a link. Managing them lives in routes/admin.js.
const router = express.Router();

// This form is open to anyone with the link, so it gets its own limiter (5 per hour per IP).
// skipFailedRequests: a request rejected for bad input (400) does not use up an attempt, so a
// client who mistypes is never locked out — only successful submissions are counted.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
});

// POST /api/testimonials/submit — a client sends their feedback. It is saved hidden and marked
// pending; nothing reaches the public site until the owner approves it in /admin.
router.post("/submit", submitLimiter, async (req, res) => {
  const body = req.body || {};

  // Honeypot: real people never see this field (it is hidden by CSS), bots fill everything.
  // Pretend it worked so the bot learns nothing, but save nothing.
  if (body.website) return res.status(201).json({ success: true });

  const lang = body.lang === "ar" ? "ar" : "en"; // the form's language decides which text field is used
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "").trim();
  const message = String(body.message ?? "").trim();
  const rating = Number(body.rating);

  if (!name || name.length > 120) return res.status(400).json({ error: "A name (up to 120 characters) is required" });
  if (role.length > 160) return res.status(400).json({ error: "The role is too long" });
  if (message.length < 10 || message.length > 1500) return res.status(400).json({ error: "The feedback must be 10 to 1500 characters" });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "The rating must be 1 to 5" });

  await Testimonial.create({
    authorName: name,
    roleEn: lang === "en" ? role : "",
    roleAr: lang === "ar" ? role : "",
    textEn: lang === "en" ? message : "",
    textAr: lang === "ar" ? message : "",
    rating,
    visible: false,
    pending: true,
    submittedLang: lang,
  });
  res.status(201).json({ success: true });
});

router.get("/", async (req, res) => {
  const items = await Testimonial.find({ visible: true }).sort({ order: 1, createdAt: -1 });
  res.json(items);
});

module.exports = router;
