// auth.js — the "are you the logged-in admin?" check, used by routes/admin.js for every
// admin request.
//
// How login works: POST /api/auth/login (routes/auth.js) checks the email + password and
// returns a JWT — a signed token that says "this is the admin" and expires after 7 days.
// The dashboard stores it and sends it with every request as a header:
//     Authorization: Bearer <token>
// requireAuth reads that header and verifies the token's signature with JWT_SECRET. Only the
// server knows that secret, so nobody can forge a token. If the check passes, the token's
// content is put on req.admin and the request continues (next()); otherwise it stops with 401.
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
