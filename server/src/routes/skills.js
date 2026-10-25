// skills.js — public, read-only list of skills for the Skills section: GET /api/skills.
// Sorted by group (backend / frontend / tools) and then by `order`. Managed in routes/admin.js.
const express = require("express");
const { Skill } = require("../lib/mongo");

const router = express.Router();

router.get("/", async (req, res) => {
  const skills = await Skill.find().sort({ group: 1, order: 1 });
  res.json(skills);
});

module.exports = router;
