const express = require("express");
const { Post } = require("../lib/mongo");
const { sendImage } = require("../lib/images");

// Public, read-only blog routes. Only PUBLISHED posts are ever visible here — drafts exist
// only in the dashboard. Writing/editing lives in routes/admin.js.
const router = express.Router();

// GET /api/posts — published posts, newest first, WITHOUT the full text (lists stay small).
router.get("/", async (req, res) => {
  res.json(await Post.find({ published: true }).select("-bodyEn -bodyAr").sort({ publishedAt: -1 }));
});

// GET /api/posts/:slug — one published post with its full text.
router.get("/:slug", async (req, res) => {
  const post = await Post.findOne({ slug: String(req.params.slug), published: true });
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json(post);
});

// GET /api/posts/:slug/cover — the cover picture of a published post.
router.get("/:slug/cover", async (req, res) => {
  const post = await Post.findOne({ slug: String(req.params.slug), published: true }).select("+cover.data");
  if (!post || !post.cover || !post.cover.size) return res.status(404).json({ error: "Not found" });
  sendImage(res, post.cover);
});

module.exports = router;
