const express = require("express");
const { SiteSettings } = require("../lib/mongo");

// Public, read-only endpoint for the site-wide profile content (Hero texts, contact links,
// location, footer role, YouTube channel description). Editing lives in routes/admin.js.
const router = express.Router();

// GET /api/settings — the saved settings, or { exists: false } so the site uses its defaults.
router.get("/", async (req, res) => {
  const settings = await SiteSettings.findOne();
  if (!settings) return res.json({ exists: false });
  res.json({ exists: true, ...settings.toJSON() });
});

module.exports = router;
