const express = require("express");
const { About } = require("../lib/mongo");

// Public, read-only endpoint for the About section. Editing lives in routes/admin.js.
const router = express.Router();

// GET /api/about — the saved content, or { exists: false } so the site uses its built-in defaults.
router.get("/", async (req, res) => {
  const about = await About.findOne();
  if (!about) return res.json({ exists: false });
  res.json({ exists: true, ...about.toJSON() });
});

module.exports = router;
