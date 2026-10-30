const express = require("express");
const rateLimit = require("express-rate-limit");
const { Form, FormResponse } = require("../lib/mongo");

// Public routes for the custom forms built in Admin → Forms: read a form to show it, and submit
// an answer. Building forms and reading the answers lives in routes/admin.js.
const router = express.Router();

// Anyone with the link can submit, so each visitor gets 10 submissions per hour. As in the
// feedback form, a submission rejected for bad input (400) does not use up an attempt.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
});

// The parts of a form a visitor needs (no dates, no internal fields).
const publicForm = (form) => ({
  slug: form.slug,
  titleEn: form.titleEn, titleAr: form.titleAr,
  descEn: form.descEn, descAr: form.descAr,
  open: form.open,
  fields: form.fields.map(({ key, type, labelEn, labelAr, required, options }) => ({ key, type, labelEn, labelAr, required, options })),
});

const findForm = (slug) => Form.findOne({ slug: String(slug).toLowerCase() });

// GET /api/forms/:slug — the form to display (also when closed, so the page can say so).
router.get("/:slug", async (req, res) => {
  const form = await findForm(req.params.slug);
  if (!form) return res.status(404).json({ error: "Form not found" });
  res.json(publicForm(form));
});

// The rules for one answer, by field type. Returns an error message, or null when it's fine.
function checkAnswer(field, value) {
  if (value.length > (field.type === "textarea" ? 3000 : 300)) return "too long";
  if (!value) return field.required ? "required" : null;
  switch (field.type) {
    case "email": return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "invalid email";
    case "phone": return /^\+?[\d\s()-]{6,25}$/.test(value) ? null : "invalid phone number";
    case "number": return Number.isFinite(Number(value)) ? null : "not a number";
    case "date": return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? null : "invalid date";
    case "select": return field.options.includes(value) ? null : "not one of the choices";
    default: return null;
  }
}

// POST /api/forms/:slug/submit  { answers: { <field key>: "<text>" }, lang, website }
router.post("/:slug/submit", submitLimiter, async (req, res) => {
  const body = req.body || {};
  // Honeypot (hidden field only bots fill in): pretend it worked, save nothing.
  if (body.website) return res.status(201).json({ success: true });

  const form = await findForm(req.params.slug);
  if (!form) return res.status(404).json({ error: "Form not found" });
  if (!form.open) return res.status(403).json({ error: "This form is closed" });

  const sent = body.answers && typeof body.answers === "object" ? body.answers : {};
  const answers = {};
  // Only the form's own fields are kept — anything else in the request is ignored.
  for (const field of form.fields) {
    const value = String(sent[field.key] ?? "").trim();
    const problem = checkAnswer(field, value);
    if (problem) return res.status(400).json({ error: `${field.labelEn || field.labelAr}: ${problem}`, field: field.key });
    if (value) answers[field.key] = value;
  }
  if (Object.keys(answers).length === 0) return res.status(400).json({ error: "The form is empty" });

  await FormResponse.create({ form: form._id, answers, lang: body.lang === "ar" ? "ar" : "en" });
  res.status(201).json({ success: true });
});

module.exports = router;
