const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  const skills = await prisma.skill.findMany({ orderBy: [{ group: "asc" }, { order: "asc" }] });
  res.json(skills);
});

module.exports = router;
