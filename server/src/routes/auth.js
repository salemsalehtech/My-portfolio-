// auth.js — the admin login: POST /api/auth/login with { email, password }.
// On success it returns { token } (a JWT valid for 7 days — see middleware/auth.js for how the
// token is checked on every admin request).
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { AdminUser } = require("../lib/mongo");

const router = express.Router();

// RATE LIMITING (task 2.1). The login form is public, so someone could try thousands of
// passwords one after another ("brute force"). This limiter allows 10 attempts per 15 minutes
// per IP address; the 11th gets "Too many login attempts" until the window passes. A real admin
// never notices it, an attacker is slowed to a crawl. It stays ON. (Counting per real visitor IP
// relies on app.set("trust proxy", 1) in app.js — Render sits behind a proxy.)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  // Same "Invalid credentials" message whether the email or the password is wrong, so the
  // answer never reveals which admin emails exist.
  const admin = await AdminUser.findOne({ email: email.toLowerCase() });
  if (!admin) return res.status(401).json({ error: "Invalid credentials" });

  // The password itself is never stored — only a bcrypt hash of it (created by the seed
  // script). bcrypt.compare hashes the typed password the same way and compares the results.
  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  // Sign a token that says who the admin is, valid for 7 days.
  const token = jwt.sign({ sub: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

module.exports = router;
