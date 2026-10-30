// images.js — checks a picture uploaded from the dashboard as base64 JSON ({ data: "<base64>" }).
// Used by routes/admin.js (certificates, blog covers, courses, projects) and
// routes/adminProducts.js (product covers and gallery pictures).
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

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

module.exports = { readImageUpload, MAX_IMAGE_BYTES };
