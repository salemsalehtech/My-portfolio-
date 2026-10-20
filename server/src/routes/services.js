const express = require("express");
const { Service } = require("../lib/mongo");

// Public, read-only list for the "What I Offer" section: only the services marked visible.
// Creating/editing/hiding lives in routes/admin.js.
const router = express.Router();

router.get("/", async (req, res) => {
  res.json(await Service.find({ visible: true }).sort({ order: 1, createdAt: 1 }));
});

module.exports = router;
