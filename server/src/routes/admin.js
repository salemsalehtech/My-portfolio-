const express = require("express");
const { Project, Skill, YoutubeVideo, ContactMessage, CvFile } = require("../lib/mongo");
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
