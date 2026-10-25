const express = require("express");
const mongoose = require("mongoose");
const { Certificate } = require("../lib/mongo");

// Public, read-only routes for the Certificates section. Creating/editing/hiding and uploading
// images lives in routes/admin.js.
const router = express.Router();

// GET /api/certificates — the visible certificates (each has `hasImage`, no image bytes).
router.get("/", async (req, res) => {
  res.json(await Certificate.find({ visible: true }).sort({ order: 1, createdAt: -1 }));
});

// GET /api/certificates/:id/image — the picture of a visible certificate.
router.get("/:id/image", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const cert = await Certificate.findById(req.params.id).select("+image.data");
  if (!cert || !cert.visible || !cert.image || !cert.image.size) return res.status(404).json({ error: "Not found" });

  res.set({
    "Content-Type": cert.image.contentType,
    "Content-Length": cert.image.data.length,
    // The site links to the image with ?v=<updatedAt>, so a new upload gets a new address:
    // browsers can keep each version for a day.
    "Cache-Control": "public, max-age=86400",
    // helmet() sets Cross-Origin-Resource-Policy: same-origin, which would stop the site
    // (github.io) from showing an image served by the API (onrender.com). Allow it here only.
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  res.send(cert.image.data);
});

module.exports = router;
