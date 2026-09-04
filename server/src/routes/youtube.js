const express = require("express");
const { YoutubeVideo } = require("../lib/mongo");

const router = express.Router();

router.get("/", async (req, res) => {
  const videos = await YoutubeVideo.find().sort({ order: 1 });
  res.json(videos);
});

module.exports = router;
