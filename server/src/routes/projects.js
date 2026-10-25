// projects.js — public, read-only list of projects for the site: GET /api/projects.
// Sorted by the `order` number set in the dashboard (lowest first). Creating, editing and
// deleting projects happens in routes/admin.js (login required).
const express = require("express");
const { Project } = require("../lib/mongo");

const router = express.Router();

router.get("/", async (req, res) => {
  const projects = await Project.find().sort({ order: 1 });
  res.json(projects);
});

module.exports = router;
