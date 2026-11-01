const express = require("express");
const mongoose = require("mongoose");
const { Course } = require("../lib/mongo");
const { sendImage } = require("../lib/images");

// Public, read-only routes for the Courses section. Creating/editing/hiding and uploading
// cover pictures lives in routes/admin.js.
const router = express.Router();

// GET /api/courses — the visible courses (each has `hasImage`, no image bytes).
router.get("/", async (req, res) => {
  res.json(await Course.find({ visible: true }).sort({ order: 1, createdAt: -1 }));
});

// GET /api/courses/:id/image — the cover picture of a visible course.
router.get("/:id/image", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const course = await Course.findById(req.params.id).select("+image.data");
  if (!course || !course.visible || !course.image || !course.image.size) return res.status(404).json({ error: "Not found" });
  sendImage(res, course.image);
});

module.exports = router;
