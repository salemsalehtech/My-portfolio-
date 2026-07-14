const express = require("express");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma");
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

  const saved = await prisma.contactMessage.create({
    data: { name: name.trim(), email: email.trim(), message: message.trim() },
  });

  try {
    await sendContactNotification({ name: saved.name, email: saved.email, message: saved.message });
  } catch (err) {
    console.error("Failed to send contact notification email:", err.message);
  }

  res.status(201).json({ success: true });
});

module.exports = router;
