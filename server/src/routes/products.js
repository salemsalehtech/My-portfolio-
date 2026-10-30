// products.js — public, read-only routes for product landing pages (/#/p/<slug>) and the
// "Products" section of the home page. Only published products are shown. Creating and editing
// lives in routes/adminProducts.js.
const express = require("express");
const mongoose = require("mongoose");
const { Product, ProductImage } = require("../lib/mongo");

const router = express.Router();

// Pictures are cached for a day; the site adds ?v=<updatedAt> (cover) or uses a new id (gallery),
// so a changed picture always gets a new address. CORP lets the github.io site show them.
function sendImage(res, image) {
  res.set({
    "Content-Type": image.contentType,
    "Content-Length": image.data.length,
    "Cache-Control": "public, max-age=86400",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  res.send(image.data);
}

// GET /api/products — the published products as cards (no page blocks).
router.get("/", async (req, res) => {
  res.json(await Product.find({ published: true }).select("-blocks").sort({ order: 1, createdAt: -1 }));
});

// GET /api/products/images/:id — a gallery picture. Pictures are served for drafts too, so the
// owner's preview (/#/p/<slug>?preview) shows them; a draft's texts stay behind the admin login.
router.get("/images/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const image = await ProductImage.findById(req.params.id);
  if (!image) return res.status(404).json({ error: "Not found" });
  sendImage(res, image);
});

// GET /api/products/:slug — one published product with its whole page.
router.get("/:slug", async (req, res) => {
  const product = await Product.findOne({ slug: String(req.params.slug).toLowerCase(), published: true });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// GET /api/products/:id/cover — the main picture (drafts too, for the preview).
router.get("/:id/cover", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const product = await Product.findById(req.params.id).select("+image.data");
  if (!product || !product.image || !product.image.size) return res.status(404).json({ error: "Not found" });
  sendImage(res, product.image);
});

module.exports = router;
