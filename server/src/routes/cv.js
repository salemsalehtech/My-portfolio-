const express = require("express");
const { CvFile } = require("../lib/mongo");

// Public, read-only endpoints for the CV. Uploading/deleting lives in routes/admin.js.
const router = express.Router();

// GET /api/cv/info — lets the site know whether to show the "Download CV" button at all.
router.get("/info", async (req, res) => {
  const cv = await CvFile.findOne().select("filename size updatedAt");
  if (!cv) return res.json({ available: false });
  res.json({ available: true, filename: cv.filename, size: cv.size, updatedAt: cv.updatedAt });
});

// GET /api/cv — the PDF itself, sent as a download.
router.get("/", async (req, res) => {
  const cv = await CvFile.findOne();
  if (!cv) return res.status(404).json({ error: "No CV has been uploaded yet" });
  res.set({
    "Content-Type": cv.contentType,
    "Content-Length": cv.data.length,
    "Content-Disposition": `attachment; filename="${cv.filename}"`,
    "Cache-Control": "public, max-age=300",
  });
  res.send(cv.data);
});

module.exports = router;
