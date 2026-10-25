// projects.js — public, read-only list of projects for the site: GET /api/projects.
// Sorted by the `order` number set in the dashboard (lowest first). Creating, editing and
// deleting projects happens in routes/admin.js (login required).
const express = require("express");
const mongoose = require("mongoose");
const { Project } = require("../lib/mongo");

const router = express.Router();

router.get("/", async (req, res) => {
  const projects = await Project.find().sort({ order: 1 });
  res.json(projects);
});

// GET /api/projects/:id/image — the project's picture (each project in the list has `hasImage`).
router.get("/:id/image", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const project = await Project.findById(req.params.id).select("+image.data");
  if (!project || !project.image || !project.image.size) return res.status(404).json({ error: "Not found" });
  res.set({
    "Content-Type": project.image.contentType,
    "Content-Length": project.image.data.length,
    "Cache-Control": "public, max-age=86400", // the site adds ?v=<updatedAt>, so a new picture gets a new address
    "Cross-Origin-Resource-Policy": "cross-origin", // let the github.io site show it (helmet blocks by default)
  });
  res.send(project.image.data);
});

module.exports = router;
