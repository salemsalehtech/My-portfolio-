// images.js — checks a picture uploaded from the dashboard as base64 JSON ({ data: "<base64>" }).
// Used by routes/admin.js (certificates, blog covers, courses, projects) and
// routes/adminProducts.js (product covers and gallery pictures). sendImage serves the saved
// pictures to the public site (routes/projects.js, certificates.js, courses.js, posts.js,
// settings.js, products.js).
const { UPLOADS } = require("./rules");
const MAX_IMAGE_BYTES = UPLOADS.image.maxBytes;

// The real file type, read from the first bytes (never trust the file name or the browser).
function imageType(buffer) {
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer.subarray(1, 4).toString("latin1") === "PNG") return "image/png";
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length > 12 && buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

// Checks an uploaded picture ({ data: "<base64>" } in the request body). Returns
// { image: { data, contentType, size } } ready to save, or { error } for a 400 response.
function readImageUpload(body) {
  const { data } = body || {};
  if (!data || typeof data !== "string") return { error: "An image file is required" };
  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0) return { error: "The file is empty" };
  if (buffer.length > MAX_IMAGE_BYTES) return { error: "Image is too large (max 2 MB)" };
  const contentType = imageType(buffer);
  if (!contentType) return { error: "The image must be PNG, JPEG or WebP" };
  return { image: { data: buffer, contentType, size: buffer.length } };
}

// Sends a saved picture ({ data, contentType }) to the public site. Cached for a day: the site adds
// ?v=<updatedAt> (or uses a new id), so a changed picture always gets a new address. helmet() sets
// Cross-Origin-Resource-Policy: same-origin, which would stop the github.io site from showing a
// picture served by the API (onrender.com), so it is allowed here.
function sendImage(res, image) {
  res.set({
    "Content-Type": image.contentType,
    "Content-Length": image.data.length,
    "Cache-Control": "public, max-age=86400",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  res.send(image.data);
}

// Adds the two dashboard routes that set and remove a document's picture:
//   PUT  <path>/:id/<route>  { data: "<base64>" } → the updated document
//   DELETE <path>/:id/<route>                     → the updated document, picture cleared
// `field` is where the picture lives on the model ("image", "cover"…). One definition for
// projects, certificates, courses, blog covers and products, so the rules can't drift apart.
function pictureRoutes(router, { path, route = "image", Model, field = "image", name }) {
  const notFound = (res) => res.status(404).json({ error: `${name} not found` });
  router.put(`${path}/:id/${route}`, async (req, res) => {
    const { image, error } = readImageUpload(req.body);
    if (error) return res.status(400).json({ error });
    const doc = await Model.findByIdAndUpdate(req.params.id, { [field]: image }, { new: true });
    return doc ? res.json(doc) : notFound(res);
  });
  router.delete(`${path}/:id/${route}`, async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, { [field]: { contentType: "", size: 0 } }, { new: true });
    return doc ? res.json(doc) : notFound(res);
  });
}

module.exports = { readImageUpload, sendImage, imageType, pictureRoutes, MAX_IMAGE_BYTES };
