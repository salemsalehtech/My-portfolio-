// admin.js — every route the dashboard (/admin) uses to change the site's content, mounted at
// /api/admin in app.js. Each resource follows the same REST pattern:
//   GET    /api/admin/<resource>       list everything (including hidden items)
//   POST   /api/admin/<resource>       create            → 201 + the new item
//   PUT    /api/admin/<resource>/:id   update            → the updated item
//   DELETE /api/admin/<resource>/:id   delete            → 204 (no content)
// Single-document resources (about, settings, cv) use PUT / DELETE without an :id.
// The public site reads the same data through the read-only routers (routes/projects.js, …).
const express = require("express");
const { readImageUpload } = require("../lib/images");
const { Project, Skill, YoutubeVideo, ContactMessage, CvFile, About, Testimonial, Service, SiteSettings, Certificate, Post, Course, Form, FormResponse } = require("../lib/mongo");
const { only } = require("../lib/fields");
const { requireAuth } = require("../middleware/auth");
const { analyticsReport } = require("../lib/analytics");

const router = express.Router();
// The lock on the whole file: requireAuth runs before EVERY route below, so none of them can
// be reached without a valid login token (see middleware/auth.js).
router.use(requireAuth);

// ---- Projects ----
// The oldest resources (projects, skills, youtube) pass req.body straight to Mongoose; the
// schema ignores unknown fields. Newer ones copy only whitelisted fields (see pickService).
// `runValidators: true` makes updates respect the schema's limits too (not only creates).
// The picture is never taken from the form — only from the upload route (PUT /projects/:id/image).
const withoutImage = ({ image, ...rest } = {}) => rest;
router.get("/projects", async (req, res) => {
  res.json(await Project.find().sort({ order: 1 }));
});
router.post("/projects", async (req, res) => {
  res.status(201).json(await Project.create(withoutImage(req.body)));
});
router.put("/projects/:id", async (req, res) => {
  const item = await Project.findByIdAndUpdate(req.params.id, withoutImage(req.body), { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Project not found" });
  res.json(item);
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
  const item = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Skill not found" });
  res.json(item);
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
  const item = await YoutubeVideo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Video not found" });
  res.json(item);
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
const TESTIMONIAL_FIELDS = ["authorName", "roleEn", "roleAr", "textEn", "textAr", "rating", "visible", "pending", "order", "project"];
const pickTestimonial = (body = {}) => {
  const data = only(body, TESTIMONIAL_FIELDS);
  if ("project" in data && !data.project) data.project = null; // "no project" in the form
  return data;
};
// The schemas require an English or an Arabic text on create; an update checks the same rule here
// when it sends both: true = both are being emptied.
const clearsBoth = (data, en, ar) => en in data && ar in data && !data[en] && !data[ar];

router.get("/testimonials", async (req, res) => {
  // Pending ones (sent by clients, waiting for review) first.
  res.json(await Testimonial.find().sort({ pending: -1, order: 1, createdAt: -1 }));
});
router.post("/testimonials", async (req, res) => {
  res.status(201).json(await Testimonial.create(pickTestimonial(req.body)));
});
router.put("/testimonials/:id", async (req, res) => {
  const data = pickTestimonial(req.body);
  if (clearsBoth(data, "textEn", "textAr")) {
    return res.status(400).json({ error: "The testimonial text is required" });
  }
  const item = await Testimonial.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Testimonial not found" });
  res.json(item);
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
  "availabilityEn", "availabilityAr", "bookingUrl",
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
  clean.availableForWork = body.availableForWork !== false;
  clean.process = asList(body.process, 6).map((p) => ({
    titleEn: String(p.titleEn ?? "").trim(), titleAr: String(p.titleAr ?? "").trim(),
    textEn: String(p.textEn ?? "").trim(), textAr: String(p.textAr ?? "").trim(),
  })).filter((p) => p.titleEn || p.titleAr);
  const settings = await SiteSettings.findOneAndUpdate({}, { $set: clean }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  res.json({ exists: true, ...settings.toJSON() });
});

router.delete("/settings", async (req, res) => {
  await SiteSettings.deleteMany({});
  res.status(204).end();
});
// PUT /api/admin/settings/photo { data: "<base64>" } — the hero portrait (PNG, JPEG or WebP, max 2 MB).
router.put("/settings/photo", async (req, res) => {
  const { image, error } = readImageUpload(req.body);
  if (error) return res.status(400).json({ error });
  const settings = await SiteSettings.findOneAndUpdate({}, { photo: image }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.json({ exists: true, ...settings.toJSON() });
});
router.delete("/settings/photo", async (req, res) => {
  const settings = await SiteSettings.findOneAndUpdate({}, { photo: { contentType: "", size: 0 } }, { new: true });
  res.json(settings ? { exists: true, ...settings.toJSON() } : { exists: false });
});

// ---- Services ----
// Same CRUD shape as testimonials: only known fields are copied from the request.
const SERVICE_FIELDS = ["titleEn", "titleAr", "descEn", "descAr", "icon", "visible", "order"];
const pickService = (body = {}) => only(body, SERVICE_FIELDS);

router.get("/services", async (req, res) => {
  res.json(await Service.find().sort({ order: 1, createdAt: 1 }));
});
router.post("/services", async (req, res) => {
  res.status(201).json(await Service.create(pickService(req.body)));
});
router.put("/services/:id", async (req, res) => {
  const data = pickService(req.body);
  if (clearsBoth(data, "titleEn", "titleAr")) {
    return res.status(400).json({ error: "A service title is required" });
  }
  const item = await Service.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Service not found" });
  res.json(item);
});
router.delete("/services/:id", async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// ---- Certificates ----
// CRUD like services, plus a separate route to upload / remove the certificate picture.
const CERTIFICATE_FIELDS = ["titleEn", "titleAr", "issuerEn", "issuerAr", "date", "credentialUrl", "visible", "order"];
const pickCertificate = (body = {}) => only(body, CERTIFICATE_FIELDS);
router.get("/certificates", async (req, res) => {
  res.json(await Certificate.find().sort({ order: 1, createdAt: -1 }));
});
router.post("/certificates", async (req, res) => {
  res.status(201).json(await Certificate.create(pickCertificate(req.body)));
});
router.put("/certificates/:id", async (req, res) => {
  const data = pickCertificate(req.body);
  if (clearsBoth(data, "titleEn", "titleAr")) {
    return res.status(400).json({ error: "A certificate title is required" });
  }
  const item = await Certificate.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Certificate not found" });
  res.json(item);
});
router.delete("/certificates/:id", async (req, res) => {
  await Certificate.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// PUT /api/admin/certificates/:id/image  { data: "<base64>" } — PNG, JPEG or WebP, max 2 MB.
router.put("/certificates/:id/image", async (req, res) => {
  const { image, error } = readImageUpload(req.body);
  if (error) return res.status(400).json({ error });
  const cert = await Certificate.findByIdAndUpdate(req.params.id, { image }, { new: true });
  if (!cert) return res.status(404).json({ error: "Certificate not found" });
  res.json(cert);
});

router.delete("/certificates/:id/image", async (req, res) => {
  const cert = await Certificate.findByIdAndUpdate(req.params.id, { image: { contentType: "", size: 0 } }, { new: true });
  if (!cert) return res.status(404).json({ error: "Certificate not found" });
  res.json(cert);
});

// PUT /api/admin/projects/:id/image  { data: "<base64>" } — same rules as certificate pictures.
router.put("/projects/:id/image", async (req, res) => {
  const { image, error } = readImageUpload(req.body);
  if (error) return res.status(400).json({ error });
  const project = await Project.findByIdAndUpdate(req.params.id, { image }, { new: true });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});
router.delete("/projects/:id/image", async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, { image: { contentType: "", size: 0 } }, { new: true });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

// ---- Courses ----
// Same as certificates: CRUD + a separate route to upload / remove the cover picture.
const COURSE_FIELDS = ["titleEn", "titleAr", "descEn", "descAr", "platform", "detailsEn", "detailsAr", "url", "visible", "order"];
const pickCourse = (body = {}) => only(body, COURSE_FIELDS);

router.get("/courses", async (req, res) => {
  res.json(await Course.find().sort({ order: 1, createdAt: -1 }));
});
router.post("/courses", async (req, res) => {
  res.status(201).json(await Course.create(pickCourse(req.body)));
});
router.put("/courses/:id", async (req, res) => {
  const data = pickCourse(req.body);
  if (clearsBoth(data, "titleEn", "titleAr")) {
    return res.status(400).json({ error: "A course title is required" });
  }
  const item = await Course.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ error: "Course not found" });
  res.json(item);
});
router.delete("/courses/:id", async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// PUT /api/admin/courses/:id/image  { data: "<base64>" } — same rules as certificate pictures.
router.put("/courses/:id/image", async (req, res) => {
  const { image, error } = readImageUpload(req.body);
  if (error) return res.status(400).json({ error });
  const course = await Course.findByIdAndUpdate(req.params.id, { image }, { new: true });
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json(course);
});
router.delete("/courses/:id/image", async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, { image: { contentType: "", size: 0 } }, { new: true });
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json(course);
});

// ---- Visitor analytics (read-only) ----
// GET /api/admin/analytics?days=7|30|90 — sums the daily counters written by routes/analytics.js
// into: one row per day (for the chart), totals, and the top sections / projects / referrers.
const ANALYTICS_RANGES = [7, 30, 90];

router.get("/analytics", async (req, res) => {
  const days = ANALYTICS_RANGES.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  res.json(await analyticsReport(days));
});

// ---- Blog posts ----
// Lists are sent without the full text; GET /posts/:id returns everything for the editor.
// Publishing: the first time a post becomes published, publishedAt is set to "now" (it keeps
// that date if it is later unpublished and published again).
const POST_FIELDS = ["slug", "titleEn", "titleAr", "excerptEn", "excerptAr", "bodyEn", "bodyAr", "tags", "published"];
function pickPost(body = {}) {
  const data = only(body, POST_FIELDS);
  if ("slug" in data) data.slug = String(data.slug || "").trim().toLowerCase();
  if ("tags" in data) data.tags = (Array.isArray(data.tags) ? data.tags : []).map((t) => String(t).trim()).filter(Boolean);
  if ("published" in data) data.published = Boolean(data.published);
  return data;
}

router.get("/posts", async (req, res) => {
  res.json(await Post.find().select("-bodyEn -bodyAr").sort({ updatedAt: -1 }));
});
router.get("/posts/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});
router.post("/posts", async (req, res) => {
  const post = new Post(pickPost(req.body));
  if (post.published && !post.publishedAt) post.publishedAt = new Date();
  await post.save();
  res.status(201).json(post);
});
router.put("/posts/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  post.set(pickPost(req.body));
  if (post.published && !post.publishedAt) post.publishedAt = new Date();
  await post.save(); // runs every schema check (slug format, lengths, "a title is required", unique slug)
  res.json(post);
});
router.delete("/posts/:id", async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// PUT /api/admin/posts/:id/cover  { data: "<base64>" } — same rules as certificate pictures.
router.put("/posts/:id/cover", async (req, res) => {
  const { image, error } = readImageUpload(req.body);
  if (error) return res.status(400).json({ error });
  const post = await Post.findByIdAndUpdate(req.params.id, { cover: image }, { new: true });
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});
router.delete("/posts/:id/cover", async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.id, { cover: { contentType: "", size: 0 } }, { new: true });
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

// ---- Forms (Form Builder) ----
// A form's fields are sent as one array from the editor; saving runs every schema check (slug
// format, unique slug, field keys, labels, list choices). Deleting a form deletes its answers too.
const FORM_FIELDS = ["slug", "titleEn", "titleAr", "descEn", "descAr", "fields", "open"];
function pickForm(body = {}) {
  const data = only(body, FORM_FIELDS);
  if ("slug" in data) data.slug = String(data.slug || "").trim().toLowerCase();
  if ("open" in data) data.open = Boolean(data.open);
  if ("fields" in data) {
    data.fields = (Array.isArray(data.fields) ? data.fields : []).map((f = {}) => ({
      key: String(f.key ?? ""),
      type: f.type,
      labelEn: String(f.labelEn ?? "").trim(),
      labelAr: String(f.labelAr ?? "").trim(),
      required: Boolean(f.required),
      options: f.type === "select" ? (Array.isArray(f.options) ? f.options : []).map((o) => String(o).trim()).filter(Boolean) : [],
    }));
  }
  return data;
}

// GET /api/admin/forms — every form, with how many answers it has received.
router.get("/forms", async (req, res) => {
  const forms = await Form.find().sort({ createdAt: -1 });
  const counts = await FormResponse.aggregate([{ $group: { _id: "$form", count: { $sum: 1 } } }]);
  const countOf = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json(forms.map((f) => ({ ...f.toJSON(), responseCount: countOf[f.id] || 0 })));
});
router.get("/forms/:id", async (req, res) => {
  const form = await Form.findById(req.params.id);
  if (!form) return res.status(404).json({ error: "Form not found" });
  res.json(form);
});
router.post("/forms", async (req, res) => {
  res.status(201).json(await new Form(pickForm(req.body)).save());
});
router.put("/forms/:id", async (req, res) => {
  const form = await Form.findById(req.params.id);
  if (!form) return res.status(404).json({ error: "Form not found" });
  form.set(pickForm(req.body));
  res.json(await form.save());
});
router.delete("/forms/:id", async (req, res) => {
  await Form.findByIdAndDelete(req.params.id);
  await FormResponse.deleteMany({ form: req.params.id });
  res.status(204).end();
});

// GET /api/admin/forms/:id/responses — the answers, newest first (shown as a sheet + Excel).
router.get("/forms/:id/responses", async (req, res) => {
  res.json(await FormResponse.find({ form: req.params.id }).sort({ createdAt: -1 }));
});
router.delete("/forms/:id/responses/:responseId", async (req, res) => {
  await FormResponse.findOneAndDelete({ _id: req.params.responseId, form: req.params.id });
  res.status(204).end();
});

// ---- Contact messages ----
// Messages are created by the public contact form (routes/contact.js); here the admin can only
// list them (newest first), mark them read/unread, and delete them.
router.get("/messages", async (req, res) => {
  res.json(await ContactMessage.find().sort({ createdAt: -1 }));
});
router.patch("/messages/:id", async (req, res) => {
  const item = await ContactMessage.findByIdAndUpdate(req.params.id, { read: !!req.body.read }, { new: true });
  if (!item) return res.status(404).json({ error: "Message not found" });
  res.json(item);
});
router.delete("/messages/:id", async (req, res) => {
  await ContactMessage.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

module.exports = router;
