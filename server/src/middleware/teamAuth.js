// teamAuth.js — the "are you a logged-in team member?" check for the member portal
// (routes/team.js). It works like middleware/auth.js, with one important difference: member
// tokens are signed with a DIFFERENT key (JWT_SECRET + ":team"). So a member token can never pass
// the admin check, and an admin token can never pass this one — the two logins stay separate.
//
// Every request also re-reads the member from the database, so disabling an account in
// Admin → Team locks that member out at once (not only when their token expires).
const jwt = require("jsonwebtoken");
const { TeamMember } = require("../lib/mongo");

const teamSecret = () => `${process.env.JWT_SECRET}:team`;

// A member token, valid for 7 days like the admin's.
const signMemberToken = (member) => jwt.sign({ sub: member.id, kind: "team" }, teamSecret(), { expiresIn: "7d" });

async function requireMember(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  let payload;
  try {
    payload = jwt.verify(token, teamSecret());
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  const member = await TeamMember.findById(payload.sub);
  if (!member || !member.active) return res.status(401).json({ error: "This account is disabled" });
  req.member = member;
  next();
}

module.exports = { requireMember, signMemberToken };
