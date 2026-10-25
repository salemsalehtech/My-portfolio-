const express = require("express");
const { Post } = require("../lib/mongo");

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
  res.set({
    "Content-Type": post.cover.contentType,
    "Content-Length": post.cover.data.length,
    "Cache-Control": "public, max-age=86400", // the site adds ?v=<updatedAt>, so a new cover gets a new address
    "Cross-Origin-Resource-Policy": "cross-origin", // let the github.io site show it (helmet blocks by default)
  });
  res.send(post.cover.data);
});

module.exports = router;
