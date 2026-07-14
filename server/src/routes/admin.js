const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ---- Projects ----
router.get("/projects", async (req, res) => {
  res.json(await prisma.project.findMany({ orderBy: { order: "asc" } }));
});
router.post("/projects", async (req, res) => {
  res.status(201).json(await prisma.project.create({ data: req.body }));
});
router.put("/projects/:id", async (req, res) => {
  res.json(await prisma.project.update({ where: { id: Number(req.params.id) }, data: req.body }));
});
router.delete("/projects/:id", async (req, res) => {
  await prisma.project.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// ---- Skills ----
router.get("/skills", async (req, res) => {
  res.json(await prisma.skill.findMany({ orderBy: [{ group: "asc" }, { order: "asc" }] }));
});
router.post("/skills", async (req, res) => {
  res.status(201).json(await prisma.skill.create({ data: req.body }));
});
router.put("/skills/:id", async (req, res) => {
  res.json(await prisma.skill.update({ where: { id: Number(req.params.id) }, data: req.body }));
});
router.delete("/skills/:id", async (req, res) => {
  await prisma.skill.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// ---- YouTube videos ----
router.get("/youtube", async (req, res) => {
  res.json(await prisma.youtubeVideo.findMany({ orderBy: { order: "asc" } }));
});
router.post("/youtube", async (req, res) => {
  res.status(201).json(await prisma.youtubeVideo.create({ data: req.body }));
});
router.put("/youtube/:id", async (req, res) => {
  res.json(await prisma.youtubeVideo.update({ where: { id: Number(req.params.id) }, data: req.body }));
});
router.delete("/youtube/:id", async (req, res) => {
  await prisma.youtubeVideo.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// ---- Contact messages ----
router.get("/messages", async (req, res) => {
  res.json(await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } }));
});
router.patch("/messages/:id", async (req, res) => {
  res.json(await prisma.contactMessage.update({ where: { id: Number(req.params.id) }, data: { read: !!req.body.read } }));
});
router.delete("/messages/:id", async (req, res) => {
  await prisma.contactMessage.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

module.exports = router;
