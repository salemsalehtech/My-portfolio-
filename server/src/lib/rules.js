// rules.js — the product rules both the server and the browser must agree on, kept in ONE place.
// The server enforces them (models, upload checks, routes); the client reads the same values from
// GET /api/meta (app.js) to check files before uploading, decide which card moves a member may
// drag, offer @lead in comments, and count "today" / "overdue" in Cairo time like the server does.
// Change a rule here and both sides follow — never copy these values into client code.
const MB = 1024 * 1024;

// Dates: due dates, standups, reminders and "overdue" are all counted in the owner's time zone.
const TIME_ZONE = "Africa/Cairo";

const UPLOADS = {
  // Site pictures (projects, certificates, courses, blog covers, products, the portrait, payment proofs).
  image: { maxBytes: 2 * MB, types: ["image/png", "image/jpeg", "image/webp"] },
  // The CV on the public site (PDF).
  cv: { maxBytes: 4 * MB, types: ["application/pdf"] },
  // Team attachments: briefs, screenshots, results and voice notes.
  attachment: {
    maxBytes: 5 * MB,
    maxFiles: 10,
    types: ["application/pdf", "image/png", "image/jpeg", "image/webp", "audio/webm", "audio/ogg", "audio/mp4"],
  },
};

const TASK_STATUSES = ["todo", "doing", "review", "done"];
// Which status changes a member may make on their own task: from → allowed targets.
// "done" is the owner's call (approve), so nobody moves a task there or out of it here.
const MEMBER_MOVES = { todo: ["doing", "review"], doing: ["todo", "review"], review: ["doing"], done: [] };
// "@lead" in a comment notifies the owner.
const OWNER_HANDLE = "lead";

const publicRules = () => ({
  timeZone: TIME_ZONE,
  uploads: UPLOADS,
  team: { statuses: TASK_STATUSES, memberMoves: MEMBER_MOVES, ownerHandle: OWNER_HANDLE },
});

module.exports = { MB, TIME_ZONE, UPLOADS, TASK_STATUSES, MEMBER_MOVES, OWNER_HANDLE, publicRules };
