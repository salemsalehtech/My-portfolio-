const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const { DailyStat, Project } = require("../lib/mongo");

// Privacy-friendly visitor analytics: POST /api/analytics/event.
// The site (client/src/lib/analytics.js) sends tiny events — "visit", "section", "project",
// "cv". Nothing about the visitor is stored: no IP, no cookie, no id — each event just adds 1
// to a counter in today's DailyStat document. Every value is checked against a fixed list or
// format first, so nobody can fill the database with arbitrary keys.
const router = express.Router();

// Generous for real visitors (one visit + a few sections/projects each), tight enough for floods.
const eventLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many events" },
});

// Must match the section ids of the site (client/src/pages/Portfolio.jsx).
const SECTIONS = ["home", "about", "services", "skills", "projects", "certificates", "testimonials", "youtube", "contact"];
const MAX_REFERRERS_PER_DAY = 50; // beyond that, new sources are counted as "other"

// Today's date in Cairo (the owner's time zone), as "YYYY-MM-DD".
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());

// Mongoose map keys can't contain "." — store "linkedin.com" as "linkedin．com" (full-width dot).
const toKey = (host) => host.replace(/\./g, "．");

// "https://www.linkedin.com/feed?x" -> "linkedin.com"; empty/invalid/own site -> "direct".
function referrerHost(value) {
  try {
    const host = new URL(String(value)).hostname.toLowerCase().replace(/^www\./, "");
    if (!/^[a-z0-9.-]{1,60}$/.test(host)) return "direct";
    const ownHost = (process.env.CLIENT_ORIGIN || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return host === ownHost ? "direct" : host;
  } catch {
    return "direct";
  }
}

router.post("/event", eventLimiter, async (req, res) => {
  const { type, name, device, lang, referrer } = req.body || {};
  const date = today();
  const inc = {};

  if (type === "visit") {
    inc.visits = 1;
    if (device === "mobile" || device === "desktop") inc[device] = 1;
    if (lang === "en" || lang === "ar") inc[lang === "en" ? "langEn" : "langAr"] = 1;
    let host = referrerHost(referrer);
    // Cap how many different sources one day can hold.
    const day = await DailyStat.findOne({ date }).select("referrers").lean();
    const known = day && day.referrers ? Object.keys(day.referrers) : [];
    if (!known.includes(toKey(host)) && known.length >= MAX_REFERRERS_PER_DAY) host = "other";
    inc[`referrers.${toKey(host)}`] = 1;
  } else if (type === "section" && SECTIONS.includes(name)) {
    inc[`sections.${name}`] = 1;
  } else if (type === "project" && mongoose.isValidObjectId(name) && (await Project.exists({ _id: name }))) {
    inc[`projects.${name}`] = 1;
  } else if (type === "cv") {
    inc.cvDownloads = 1;
  } else {
    return res.status(400).json({ error: "Unknown event" });
  }

  await DailyStat.updateOne({ date }, { $inc: inc }, { upsert: true });
  res.status(204).end();
});

module.exports = router;
