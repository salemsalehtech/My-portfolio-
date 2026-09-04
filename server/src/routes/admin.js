const express = require("express");
const { Project, Skill, YoutubeVideo, ContactMessage } = require("../lib/mongo");
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
