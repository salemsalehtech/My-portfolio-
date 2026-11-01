// whatsapp.js — a link that opens a WhatsApp chat, used by the savings circles (lib/circles.js) and
// the contact messages in the dashboard (pages/admin/AdminMessages.jsx).

// A WhatsApp chat with a ready message (Egyptian numbers 01… become 201…).
export const whatsappLink = (phone, text = "") => {
  const digits = String(phone || "").replace(/\D/g, "");
  const intl = digits.startsWith("0") && digits.length === 11 ? `2${digits}` : digits;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};
