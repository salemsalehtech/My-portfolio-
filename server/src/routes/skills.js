const express = require("express");
const { Skill } = require("../lib/mongo");

const router = express.Router();

router.get("/", async (req, res) => {
  const skills = await Skill.find().sort({ group: 1, order: 1 });
  res.json(skills);
});

module.exports = router;
