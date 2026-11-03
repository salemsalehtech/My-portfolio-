// contact.js — the public contact form: POST /api/contact with { name, email, message, projectType,
// timeline, budget, channel, phone }.
// The message is checked, saved in MongoDB (the owner reads it in Admin → Messages), and an
// email notification is sent in the background (lib/mailer.js).
const express = require("express");
const rateLimit = require("express-rate-limit");
const { ContactMessage } = require("../lib/mongo");
const { sendContactNotification } = require("../lib/mailer");

const router = express.Router();

// RATE LIMITING (task 2.1). Anyone can post this form, so a bot could fill the database (and
// the owner's inbox) with spam. 10 messages per 15 minutes per IP is far more than a real person
// sends, and stops floods. It stays ON.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages sent. Please try again later." },
});

const emailRegex = /^\S+@\S+\.\S+$/;
const text = (value) => (typeof value === "string" ? value.trim() : "");

router.post("/", contactLimiter, async (req, res) => {
  const body = req.body || {};
  // Honeypot: a hidden field real people never see; bots fill everything. Pretend it worked, save nothing.
  if (body.website) return res.status(201).json({ success: true });
  const name = text(body.name), email = text(body.email), message = text(body.message);
  const channel = body.channel === "whatsapp" ? "whatsapp" : "email";
  // A WhatsApp number keeps its digits (and a leading +): "+20 100 123 4567" -> "+201001234567".
  const phone = text(body.phone).replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");

  // Check every field on the server too — the form's own checks can be skipped by anyone
  // calling the API directly. The email is required unless the visitor asked for WhatsApp.
  if (!name) return res.status(400).json({ error: "Name is required" });
  if ((channel === "email" || email) && !emailRegex.test(email)) return res.status(400).json({ error: "A valid email is required" });
  if (channel === "whatsapp" && !/^\+?\d{8,15}$/.test(phone)) return res.status(400).json({ error: "A valid WhatsApp number is required" });
  if (!message) return res.status(400).json({ error: "Message is required" });

  const saved = await ContactMessage.create({
    name, email, message, channel, phone: channel === "whatsapp" ? phone : "",
    projectType: text(body.projectType), timeline: text(body.timeline), budget: text(body.budget),
  });

  // Reply as soon as the message is saved. The notification email is sent in the background
  // so a slow or blocked SMTP server (e.g. Render's free tier blocks port 587) can never
  // make the visitor wait; a failure is only logged.
  res.status(201).json({ success: true });

  sendContactNotification(saved).catch((err) => {
    console.error("Failed to send contact notification email:", err.message);
  });
});

module.exports = router;
