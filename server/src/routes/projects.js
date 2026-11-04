// projects.js — public, read-only projects for the site: GET /api/projects (the cards, sorted by the
// `order` number set in the dashboard, lowest first) and GET /api/projects/:slug (one case-study
// page). Creating, editing and deleting projects happens in routes/admin.js (login required).
const express = require("express");
const mongoose = require("mongoose");
const { Project, Testimonial } = require("../lib/mongo");
const { sendImage } = require("../lib/images");

const router = express.Router();

router.get("/", async (req, res) => {
  // The long stories are only needed on the project's own page.
  const projects = await Project.find().select("-storyEn -storyAr").sort({ order: 1 });
  res.json(projects);
});

// GET /api/projects/:slug — one project with the visible reviews about it. Projects saved before
// they had a link name are found by their id instead.
router.get("/:slug", async (req, res) => {
  const key = String(req.params.slug);
  const project = (/^[a-z0-9-]{1,80}$/.test(key) && (await Project.findOne({ slug: key })))
    || (mongoose.isValidObjectId(key) && (await Project.findById(key)));
  if (!project) return res.status(404).json({ error: "Not found" });
  const testimonials = await Testimonial.find({ visible: true, project: project._id }).sort({ order: 1, createdAt: -1 });
  res.json({ ...project.toJSON(), testimonials });
});

// GET /api/projects/:id/image — the project's picture (each project in the list has `hasImage`).
router.get("/:id/image", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const project = await Project.findById(req.params.id).select("+image.data");
  if (!project || !project.image || !project.image.size) return res.status(404).json({ error: "Not found" });
  sendImage(res, project.image);
});

module.exports = router;
