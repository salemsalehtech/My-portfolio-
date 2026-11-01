const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Fail fast instead of hanging for minutes when the SMTP host is unreachable.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TIMELINE_LABELS = { asap: "As soon as possible", month: "Within a month", quarter: "1–3 months", flexible: "No rush" };

async function sendContactNotification({ name, email, message, projectType, timeline, budget, channel, phone }) {
  const t = getTransporter();
  if (!t) {
    console.warn("Mailer not configured (missing SMTP env vars) — skipping email notification.");
    return;
  }
  // The brief's short answers, one line each (empty ones are left out).
  const lines = [
    ["Reply on", channel === "whatsapp" ? `WhatsApp ${phone}` : "Email"],
    ["Needs", projectType], ["When", TIMELINE_LABELS[timeline]], ["Budget", budget],
  ].filter(([, value]) => value);
  const from = email ? `${name} <${email}>` : name;
  await t.sendMail({
    from: `"Portfolio Contact Form" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL || process.env.SMTP_USER,
    ...(email ? { replyTo: email } : {}),
    subject: `New contact message from ${name}`,
    text: `From: ${from}\n${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${message}`,
    html: `<p><strong>From:</strong> ${escapeHtml(from)}</p>` +
      lines.map(([k, v]) => `<p><strong>${k}:</strong> ${escapeHtml(v)}</p>`).join("") +
      `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
  });
}

module.exports = { sendContactNotification };
