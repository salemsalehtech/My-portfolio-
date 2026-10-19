const express = require("express");
const rateLimit = require("express-rate-limit");
const { ContactMessage } = require("../lib/mongo");
const { sendContactNotification } = require("../lib/mailer");

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages sent. Please try again later." },
});

const emailRegex = /^\S+@\S+\.\S+$/;

router.post("/", contactLimiter, async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
  if (!email || !emailRegex.test(email)) return res.status(400).json({ error: "A valid email is required" });
  if (!message || !message.trim()) return res.status(400).json({ error: "Message is required" });

  const saved = await ContactMessage.create({ name: name.trim(), email: email.trim(), message: message.trim() });

  // Reply as soon as the message is saved. The notification email is sent in the background
  // so a slow or blocked SMTP server (e.g. Render's free tier blocks port 587) can never
  // make the visitor wait; a failure is only logged.
  res.status(201).json({ success: true });

  sendContactNotification({ name: saved.name, email: saved.email, message: saved.message }).catch((err) => {
    console.error("Failed to send contact notification email:", err.message);
  });
});

module.exports = router;
