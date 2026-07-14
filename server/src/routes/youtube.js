const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  const videos = await prisma.youtubeVideo.findMany({ orderBy: { order: "asc" } });
  res.json(videos);
});

module.exports = router;
