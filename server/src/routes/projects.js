const express = require("express");
const { Project } = require("../lib/mongo");

const router = express.Router();

router.get("/", async (req, res) => {
  const projects = await Project.find().sort({ order: 1 });
  res.json(projects);
});

module.exports = router;
