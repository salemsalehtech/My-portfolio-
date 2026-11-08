// attachments.js — files attached to a team task (a PDF brief, a screenshot, a voice note, the result).
// Sent from the dashboard as base64 JSON ({ name: "brief.pdf", data: "<base64>" }), like the CV,
// and stored in MongoDB (TeamAttachment) because Render's free disk is wiped on every deploy.
// Used by routes/adminTeam.js (upload, list, open, delete) and routes/team.js (list, open).
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_TASK = 10;

// The real file type, read from the first bytes (never trust the file name or the browser).
function attachmentType(buffer) {
  if (buffer.length > 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buffer.length > 8 && buffer[0] === 0x89 && buffer.subarray(1, 4).toString("latin1") === "PNG") return "image/png";
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length > 12 && buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  // Voice notes recorded in the browser: Chrome/Firefox make WebM or Ogg (Opus), Safari makes MP4 (AAC).
  if (buffer.length > 4 && buffer.readUInt32BE(0) === 0x1a45dfa3) return "audio/webm";
  if (buffer.length > 4 && buffer.subarray(0, 4).toString("latin1") === "OggS") return "audio/ogg";
  if (buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp") return "audio/mp4";
  return null;
}

const EXTENSION = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a",
};

// Keeps a readable file name: no paths, no quotes or control characters, the right extension.
function cleanName(name, contentType) {
  const ext = EXTENSION[contentType];
  const base = String(name || "")
    .split(/[\\/]/).pop()
    .replace(/[\u0000-\u001f"<>|:*?]/g, "")
    .replace(/\.[^.]*$/, "")
    .trim()
    .slice(0, 100);
  return `${base || "file"}.${ext}`;
}

// Checks an upload. Returns { file: { filename, contentType, size, data } } or { error } for a 400.
function readAttachmentUpload(body) {
  const { data, name } = body || {};
  if (!data || typeof data !== "string") return { error: "A file is required" };
  const buffer = Buffer.from(data, "base64");
  if (buffer.length === 0) return { error: "The file is empty" };
  if (buffer.length > MAX_ATTACHMENT_BYTES) return { error: "File is too large (max 5 MB)" };
  const contentType = attachmentType(buffer);
  if (!contentType) return { error: "Only PDF, PNG, JPEG, WebP or a voice note are allowed" };
  return { file: { filename: cleanName(name, contentType), contentType, size: buffer.length, data: buffer } };
}

// Sends a stored attachment. Private (members only), so it is never cached by shared caches.
// The file name goes in RFC 5987 form so Arabic names survive.
function sendAttachment(res, file) {
  res.set({
    "Content-Type": file.contentType,
    "Content-Length": file.data.length,
    "Content-Disposition": `inline; filename="file.${EXTENSION[file.contentType]}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
  });
  res.send(file.data);
}

module.exports = { readAttachmentUpload, sendAttachment, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_TASK };
