// auth.js — the "are you the logged-in admin?" check, used by every admin route.
//
// How login works: POST /api/auth/login (routes/auth.js) checks the email + password and
// returns a JWT — a signed token that says "this is the admin" and expires after 7 days.
// The dashboard stores it and sends it with every request as a header:
//     Authorization: Bearer <token>
// requireAuth verifies the token's signature with JWT_SECRET (only the server knows it, so nobody
// can forge a token) AND that it still matches the admin account: every token carries the
// account's `tokenVersion`, and "Sign out on all devices" (or re-seeding the admin password)
// raises that number — so a stolen or old token stops working at once instead of living 7 days.
// If both checks pass, the token's content is put on req.admin; otherwise the answer is 401.
const jwt = require("jsonwebtoken");
const { AdminUser } = require("../lib/mongo");

const signAdminToken = (admin) =>
  jwt.sign({ sub: admin.id, email: admin.email, v: admin.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "7d" });

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  const admin = /^[0-9a-f]{24}$/i.test(String(payload.sub)) && await AdminUser.findById(payload.sub).select("tokenVersion").lean();
  if (!admin || (admin.tokenVersion || 0) !== payload.v) return res.status(401).json({ error: "Invalid or expired token" });
  req.admin = payload;
  next();
}

module.exports = { requireAuth, signAdminToken };
