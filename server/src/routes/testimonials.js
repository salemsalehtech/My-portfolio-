const express = require("express");
const { Testimonial } = require("../lib/mongo");

// Public, read-only list for the Testimonials section: only the ones marked visible.
// Creating/editing/hiding lives in routes/admin.js.
const router = express.Router();

router.get("/", async (req, res) => {
  const items = await Testimonial.find({ visible: true }).sort({ order: 1, createdAt: -1 });
  res.json(items);
});

module.exports = router;
