// contactBrief.js — the short answers of the contact form ("Tell me about your project"), shared by
// the form (components/Contact.jsx) and the dashboard's message list (pages/admin/AdminMessages.jsx).
// The server stores the timeline as its id (server/src/lib/mongo.js → CONTACT_TIMELINES) and the
// budget as the label the visitor saw.
export const TIMELINES = [
  { id: "asap", en: "As soon as possible", ar: "في أسرع وقت" },
  { id: "month", en: "Within a month", ar: "خلال شهر" },
  { id: "quarter", en: "1–3 months", ar: "خلال 1–3 شهور" },
  { id: "flexible", en: "No rush", ar: "مش مستعجل" },
];

// Budgets in the visitor's currency: dollars on the English page, Egyptian pounds on the Arabic one.
export const BUDGETS = {
  en: ["Under $300", "$300–1,000", "$1,000–3,000", "$3,000+", "Not sure yet"],
  ar: ["أقل من 10 آلاف جنيه", "10–30 ألف جنيه", "30–100 ألف جنيه", "أكتر من 100 ألف جنيه", "مش عارف لسه"],
};

export const timelineLabel = (id, lang = "en") => TIMELINES.find((x) => x.id === id)?.[lang] || "";

// The visitor's unsent answers stay on their device, so a reload or a closed tab loses nothing.
export const DRAFT_KEY = "contactDraft";

// Starts the brief with a first line (e.g. "something like <project>" from a case-study page),
// unless the visitor already wrote a message. Storage may be blocked: then nothing is kept.
export function prefillMessage(text) {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    if (!draft.message) localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, message: text }));
  } catch { /* storage unavailable */ }
}
