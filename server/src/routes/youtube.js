// youtube.js — public, read-only list of YouTube videos shown in the YouTube section:
// GET /api/youtube, sorted by `order`. Managed in routes/admin.js (login required).
const express = require("express");
const { YoutubeVideo } = require("../lib/mongo");

const router = express.Router();

router.get("/", async (req, res) => {
  const videos = await YoutubeVideo.find().sort({ order: 1 });
  res.json(videos);
});

module.exports = router;
