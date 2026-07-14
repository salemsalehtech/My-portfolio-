const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  const projects = await prisma.project.findMany({ orderBy: { order: "asc" } });
  res.json(projects);
});

module.exports = router;
