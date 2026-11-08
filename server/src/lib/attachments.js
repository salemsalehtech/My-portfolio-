// attachments.js — files attached to a team task (a PDF brief, a screenshot, a voice note, the result).
// Sent from the dashboard as base64 JSON ({ name: "brief.pdf", data: "<base64>" }), like the CV,
// and stored in MongoDB (TeamAttachment) because Render's free disk is wiped on every deploy.
// Used by routes/adminTeam.js (upload, list, open, delete) and routes/team.js (list, open).
const { UPLOADS } = require("./rules");
const MAX_ATTACHMENT_BYTES = UPLOADS.attachment.maxBytes;
const MAX_ATTACHMENTS_PER_TASK = UPLOADS.attachment.maxFiles;

const { imageType } = require("./images");

// The real file type, read from the first bytes (never trust the file name or the browser).
// Pictures are recognised by images.js — the one place that knows PNG / JPEG / WebP.
function attachmentType(buffer) {
  if (buffer.length > 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  const picture = imageType(buffer);
  if (picture) return picture;
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

// Saves an uploaded file under its parent — `owner` is { task, project } or { announcement } —
// after the 10-files limit and the type / size checks. Answers the 400 itself and returns null
// when the upload is refused, so each route stays short. `member` = who uploaded (null = owner).
async function saveAttachment(res, { owner, member = null, body }) {
  const { TeamAttachment } = require("./mongo");
  const parent = owner.announcement ? { announcement: owner.announcement } : { task: owner.task };
  if (await TeamAttachment.countDocuments(parent) >= MAX_ATTACHMENTS_PER_TASK) {
    res.status(400).json({ error: "Up to 10 files per task" });
    return null;
  }
  const { file, error } = readAttachmentUpload(body);
  if (error) {
    res.status(400).json({ error });
    return null;
  }
  return TeamAttachment.create({ ...file, ...owner, member });
}

module.exports = { readAttachmentUpload, sendAttachment, saveAttachment, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_TASK };
