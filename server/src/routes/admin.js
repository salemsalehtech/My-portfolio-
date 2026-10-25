// admin.js — every route the dashboard (/admin) uses to change the site's content, mounted at
// /api/admin in app.js. Each resource follows the same REST pattern:
//   GET    /api/admin/<resource>       list everything (including hidden items)
//   POST   /api/admin/<resource>       create            → 201 + the new item
//   PUT    /api/admin/<resource>/:id   update            → the updated item
//   DELETE /api/admin/<resource>/:id   delete            → 204 (no content)
// Single-document resources (about, settings, cv) use PUT / DELETE without an :id.
// The public site reads the same data through the read-only routers (routes/projects.js, …).
const express = require("express");
const { Project, Skill, YoutubeVideo, ContactMessage, CvFile, About, Testimonial, Service, SiteSettings, Certificate } = require("../lib/mongo");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
// The lock on the whole file: requireAuth runs before EVERY route below, so none of them can
// be reached without a valid login token (see middleware/auth.js).
router.use(requireAuth);

// ---- Projects ----
// The oldest resources (projects, skills, youtube) pass req.body straight to Mongoose; the
// schema ignores unknown fields. Newer ones copy only whitelisted fields (see pickService).
// `runValidators: true` makes updates respect the schema's limits too (not only creates).
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
  "interestsTitleEn", "interestsTitleAr", "videoUrl",
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

// ---- Site settings ("Profile & Links") ----
// One document, same approach as About: whitelist of text fields + a capped `titles` list.
// Link/email formats are checked by the schema (runValidators) and come back as a 400.
const SETTINGS_TEXT_FIELDS = [
  "greetingEn", "greetingAr", "nameEn", "nameAr", "taglineEn", "taglineAr", "uspEn", "uspAr",
  "email", "githubUrl", "linkedinUrl", "youtubeUrl",
  "locationEn", "locationAr", "roleEn", "roleAr", "channelDescEn", "channelDescAr",
];

router.get("/settings", async (req, res) => {
  const settings = await SiteSettings.findOne();
  res.json(settings ? { exists: true, ...settings.toJSON() } : { exists: false });
});

router.put("/settings", async (req, res) => {
  const body = req.body || {};
  const clean = {};
  for (const field of SETTINGS_TEXT_FIELDS) clean[field] = String(body[field] ?? "").trim();
  clean.titles = asList(body.titles, 6).map((t) => ({ en: String(t.en ?? "").trim(), ar: String(t.ar ?? "").trim() }));
  const settings = await SiteSettings.findOneAndUpdate({}, { $set: clean }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  res.json({ exists: true, ...settings.toJSON() });
});

router.delete("/settings", async (req, res) => {
  await SiteSettings.deleteMany({});
  res.status(204).end();
});

// ---- Services ----
// Same CRUD shape as testimonials: only known fields are copied from the request.
const SERVICE_FIELDS = ["titleEn", "titleAr", "descEn", "descAr", "icon", "visible", "order"];
const pickService = (body = {}) => Object.fromEntries(SERVICE_FIELDS.filter((f) => f in body).map((f) => [f, body[f]]));

router.get("/services", async (req, res) => {
  res.json(await Service.find().sort({ order: 1, createdAt: 1 }));
});
router.post("/services", async (req, res) => {
  res.status(201).json(await Service.create(pickService(req.body)));
});
router.put("/services/:id", async (req, res) => {
  const data = pickService(req.body);
  // The "at least one title" rule runs on create; on update, check it here when both titles are sent.
  if ("titleEn" in data && "titleAr" in data && !data.titleEn && !data.titleAr) {
    return res.status(400).json({ error: "A service title is required" });
  }
  res.json(await Service.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }));
});
router.delete("/services/:id", async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// ---- Certificates ----
// CRUD like services, plus a separate route to upload / remove the certificate picture.
const CERTIFICATE_FIELDS = ["titleEn", "titleAr", "issuerEn", "issuerAr", "date", "credentialUrl", "visible", "order"];
const pickCertificate = (body = {}) => Object.fromEntries(CERTIFICATE_FIELDS.filter((f) => f in body).map((f) => [f, body[f]]));
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// The real file type, read from the first bytes (never trust the file name or the browser).
function imageType(buffer) {
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer.subarray(1, 4).toString("latin1") === "PNG") return "image/png";
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length > 12 && buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

router.get("/certificates", async (req, res) => {
  res.json(await Certificate.find().sort({ order: 1, createdAt: -1 }));
});
router.post("/certificates", async (req, res) => {
  res.status(201).json(await Certificate.create(pickCertificate(req.body)));
});
router.put("/certificates/:id", async (req, res) => {
  const data = pickCertificate(req.body);
  if ("titleEn" in data && "titleAr" in data && !data.titleEn && !data.titleAr) {
    return res.status(400).json({ error: "A certificate title is required" });
  }
  res.json(await Certificate.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }));
});
router.delete("/certificates/:id", async (req, res) => {
  await Certificate.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// PUT /api/admin/certificates/:id/image  { data: "<base64>" } — PNG, JPEG or WebP, max 2 MB.
router.put("/certificates/:id/image", async (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== "string") return res.status(400).json({ error: "An image file is required" });
  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0) return res.status(400).json({ error: "The file is empty" });
  if (buffer.length > MAX_IMAGE_BYTES) return res.status(400).json({ error: "Image is too large (max 2 MB)" });
  const contentType = imageType(buffer);
  if (!contentType) return res.status(400).json({ error: "The image must be PNG, JPEG or WebP" });

  const cert = await Certificate.findByIdAndUpdate(
    req.params.id,
    { image: { data: buffer, contentType, size: buffer.length } },
    { new: true }
  );
  if (!cert) return res.status(404).json({ error: "Certificate not found" });
  res.json(cert);
});

router.delete("/certificates/:id/image", async (req, res) => {
  const cert = await Certificate.findByIdAndUpdate(req.params.id, { image: { contentType: "", size: 0 } }, { new: true });
  if (!cert) return res.status(404).json({ error: "Certificate not found" });
  res.json(cert);
});

// ---- Contact messages ----
// Messages are created by the public contact form (routes/contact.js); here the admin can only
// list them (newest first), mark them read/unread, and delete them.
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
