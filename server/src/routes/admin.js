const express = require("express");
const { Project, Skill, YoutubeVideo, ContactMessage, CvFile, About, Testimonial } = require("../lib/mongo");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ---- Projects ----
router.get("/projects", async (req, res) => {
  res.json(await Project.find().sort({ order: 1 }));
});
router.post("/projects", async (req, res) => {
  res.status(201).json(await Project.create(req.body));
});
router.put("/projects/:id", async (req, res) => {
  res.json(await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }));
});
router.delete("/projects/:id", async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// ---- Skills ----
router.get("/skills", async (req, res) => {
  res.json(await Skill.find().sort({ group: 1, order: 1 }));
});
router.post("/skills", async (req, res) => {
  res.status(201).json(await Skill.create(req.body));
});
router.put("/skills/:id", async (req, res) => {
  res.json(await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }));
});
router.delete("/skills/:id", async (req, res) => {
  await Skill.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// ---- YouTube videos ----
router.get("/youtube", async (req, res) => {
  res.json(await YoutubeVideo.find().sort({ order: 1 }));
});
router.post("/youtube", async (req, res) => {
  res.status(201).json(await YoutubeVideo.create(req.body));
});
router.put("/youtube/:id", async (req, res) => {
  res.json(await YoutubeVideo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }));
});
router.delete("/youtube/:id", async (req, res) => {
  await YoutubeVideo.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// ---- CV (PDF) ----
// The client sends { filename, data } where data is the file encoded as base64. We re-check
// everything here (never trust the browser): it must decode, be small, and really be a PDF.
const MAX_CV_BYTES = 4 * 1024 * 1024;

router.put("/cv", async (req, res) => {
  const { filename, data } = req.body || {};
  if (!data || typeof data !== "string") return res.status(400).json({ error: "A PDF file is required" });

  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0) return res.status(400).json({ error: "The file is empty" });
  if (buffer.length > MAX_CV_BYTES) return res.status(400).json({ error: "File is too large (max 4 MB)" });
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") return res.status(400).json({ error: "File must be a PDF" });

  // Keep only safe characters: the name ends up inside a Content-Disposition header.
  const safeName = String(filename || "cv.pdf").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "cv.pdf";

  // One CV at a time: replace the existing document, or create it on the first upload.
  const cv = await CvFile.findOneAndUpdate(
    {},
    { filename: safeName, contentType: "application/pdf", size: buffer.length, data: buffer },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ available: true, filename: cv.filename, size: cv.size, updatedAt: cv.updatedAt });
});

router.delete("/cv", async (req, res) => {
  await CvFile.deleteMany({});
  res.status(204).end();
});

// ---- About section ----
// One document holds the whole section. PUT replaces its content; DELETE removes it so the
// site goes back to its built-in defaults. We copy only the fields we know about (a plain
// whitelist) and cap the list sizes, so a bad request can't write arbitrary data.
const ABOUT_TEXT_FIELDS = [
  "badgeEn", "badgeAr", "titleEn", "titleAr",
  "p1En", "p1Ar", "p2En", "p2Ar",
  "interestsTitleEn", "interestsTitleAr",
];
const asList = (value, max) => (Array.isArray(value) ? value.slice(0, max) : []);

router.get("/about", async (req, res) => {
  const about = await About.findOne();
  res.json(about ? { exists: true, ...about.toJSON() } : { exists: false });
});

router.put("/about", async (req, res) => {
  const body = req.body || {};
  const clean = {};
  for (const field of ABOUT_TEXT_FIELDS) clean[field] = String(body[field] ?? "");
  clean.infoItems = asList(body.infoItems, 10).map((i) => ({ icon: i.icon, textEn: String(i.textEn ?? ""), textAr: String(i.textAr ?? "") }));
  clean.stats = asList(body.stats, 6).map((s) => ({ number: String(s.number ?? ""), labelEn: String(s.labelEn ?? ""), labelAr: String(s.labelAr ?? "") }));
  clean.interests = asList(body.interests, 20).map((i) => ({ en: String(i.en ?? ""), ar: String(i.ar ?? "") }));

  const about = await About.findOneAndUpdate({}, { $set: clean }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  res.json({ exists: true, ...about.toJSON() });
});

router.delete("/about", async (req, res) => {
  await About.deleteMany({});
  res.status(204).end();
});

// ---- Testimonials ----
// Same CRUD shape as the other resources, but we copy only the known fields from the request
// instead of passing req.body straight to Mongoose. Schema limits (rating 1-5, text length)
// are enforced by Mongoose and come back as a 400 error.
const TESTIMONIAL_FIELDS = ["authorName", "roleEn", "roleAr", "textEn", "textAr", "rating", "visible", "pending", "order"];
const pickTestimonial = (body = {}) => Object.fromEntries(TESTIMONIAL_FIELDS.filter((f) => f in body).map((f) => [f, body[f]]));

router.get("/testimonials", async (req, res) => {
  // Pending ones (sent by clients, waiting for review) first.
  res.json(await Testimonial.find().sort({ pending: -1, order: 1, createdAt: -1 }));
});
router.post("/testimonials", async (req, res) => {
  res.status(201).json(await Testimonial.create(pickTestimonial(req.body)));
});
router.put("/testimonials/:id", async (req, res) => {
  const data = pickTestimonial(req.body);
  // The "at least one text" rule runs on create; on update, check it here when both texts are sent.
  if ("textEn" in data && "textAr" in data && !data.textEn && !data.textAr) {
    return res.status(400).json({ error: "The testimonial text is required" });
  }
  res.json(await Testimonial.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }));
});
router.delete("/testimonials/:id", async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// ---- Contact messages ----
router.get("/messages", async (req, res) => {
  res.json(await ContactMessage.find().sort({ createdAt: -1 }));
});
router.patch("/messages/:id", async (req, res) => {
  res.json(await ContactMessage.findByIdAndUpdate(req.params.id, { read: !!req.body.read }, { new: true }));
});
router.delete("/messages/:id", async (req, res) => {
  await ContactMessage.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

module.exports = router;
