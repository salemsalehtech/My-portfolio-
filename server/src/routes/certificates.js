const express = require("express");
const mongoose = require("mongoose");
const { Certificate } = require("../lib/mongo");
const { sendImage } = require("../lib/images");

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
  sendImage(res, cert.image);
});

module.exports = router;
