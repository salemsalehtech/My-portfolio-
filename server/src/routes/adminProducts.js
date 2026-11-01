// adminProducts.js — the owner's side of product landing pages (/api/admin/products, login
// required — mounted behind requireAuth in app.js). The public side is routes/products.js.
//
//   - products: list, create (also "Publish as product" from a team project), read one (drafts
//     too, for editing and the preview), update the page and its blocks, delete
//   - the cover picture, and gallery pictures (ProductImage) used inside gallery blocks
const express = require("express");
const mongoose = require("mongoose");
const { Product, ProductImage, TeamProject } = require("../lib/mongo");
const { only } = require("../lib/fields");
const { readImageUpload } = require("../lib/images");

const router = express.Router();

const PRODUCT_FIELDS = ["slug", "published", "order", "accent", "nameEn", "nameAr", "taglineEn", "taglineAr",
  "summaryEn", "summaryAr", "demoUrl", "formSlug", "sourceProject", "blocks"];
const BLOCK_FIELDS = ["type", "titleEn", "titleAr", "bodyEn", "bodyAr", "url", "items"];
const ITEM_FIELDS = ["titleEn", "titleAr", "subtitleEn", "subtitleAr", "textEn", "textAr", "priceEgp", "priceUsd", "highlight", "image"];

// Keeps only the known fields of the product, its blocks and their items (the client can't sneak
// in anything else, e.g. the cover picture).
function pickProduct(body = {}) {
  const data = only(body, PRODUCT_FIELDS);
  if ("sourceProject" in data && !mongoose.isValidObjectId(data.sourceProject)) data.sourceProject = null;
  if ("blocks" in data) {
    data.blocks = (Array.isArray(data.blocks) ? data.blocks : []).map((b) => {
      const block = only(b, BLOCK_FIELDS);
      block.items = (Array.isArray(block.items) ? block.items : []).map((i) => {
        const item = only(i, ITEM_FIELDS);
        if ("image" in item && !mongoose.isValidObjectId(item.image)) item.image = null;
        return item;
      });
      return block;
    });
  }
  return data;
}

// Mongoose errors as one readable sentence ("Link name: a-z, 0-9…" instead of
// "Product validation failed: slug: …"), and a clear message for a taken link name.
async function saving(res, work) {
  try {
    return await work();
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "This link name is already used by another product" });
    if (err.name === "ValidationError") return res.status(400).json({ error: Object.values(err.errors)[0].message });
    throw err;
  }
}

router.get("/", async (req, res) => {
  res.json(await Product.find().select("-blocks").sort({ order: 1, createdAt: -1 }));
});
router.post("/", (req, res) => saving(res, async () => {
  const data = pickProduct(req.body);
  if (data.sourceProject && !(await TeamProject.exists({ _id: data.sourceProject }))) data.sourceProject = null;
  res.status(201).json(await Product.create({ ...data, published: false })); // always starts as a draft
}));
router.get("/:id", async (req, res) => {
  const product = mongoose.isValidObjectId(req.params.id) && await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});
router.put("/:id", (req, res) => saving(res, async () => {
  const product = mongoose.isValidObjectId(req.params.id) && await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  product.set(pickProduct(req.body));
  await product.save();
  res.json(product);
}));
router.delete("/:id", async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) {
    await Product.findByIdAndDelete(req.params.id);
    await ProductImage.deleteMany({ product: req.params.id });
  }
  res.status(204).end();
});

// PUT /:id/cover { data: "<base64>" } — the main picture (PNG, JPEG or WebP, max 2 MB).
router.put("/:id/cover", async (req, res) => {
  const { image, error } = readImageUpload(req.body);
  if (error) return res.status(400).json({ error });
  const product = await Product.findByIdAndUpdate(req.params.id, { image }, { new: true });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});
router.delete("/:id/cover", async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { image: { contentType: "", size: 0 } }, { new: true });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// POST /:id/images { data } → { id } — a gallery picture; the editor puts the id in a gallery item.
router.post("/:id/images", async (req, res) => {
  const { image, error } = readImageUpload(req.body);
  if (error) return res.status(400).json({ error });
  if (!mongoose.isValidObjectId(req.params.id) || !(await Product.exists({ _id: req.params.id }))) {
    return res.status(404).json({ error: "Product not found" });
  }
  if ((await ProductImage.countDocuments({ product: req.params.id })) >= 60) {
    return res.status(400).json({ error: "Up to 60 pictures per product — delete some first" });
  }
  const saved = await ProductImage.create({ product: req.params.id, ...image });
  res.status(201).json({ id: saved.id });
});
router.delete("/images/:imageId", async (req, res) => {
  if (mongoose.isValidObjectId(req.params.imageId)) await ProductImage.findByIdAndDelete(req.params.imageId);
  res.status(204).end();
});

module.exports = router;
