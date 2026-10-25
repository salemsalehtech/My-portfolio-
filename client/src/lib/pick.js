// pick.js — chooses the English or Arabic version of a text for the current language.
// If the text only exists in one language, that one is shown instead of an empty string.
export const pick = (lang, en, ar) => (lang === "ar" ? ar || en : en || ar);

// "https://www.github.com/someone/" -> "github.com/someone" (for showing a link as text).
export const linkLabel = (url) => String(url).replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");

// "https://www.youtube.com/@SalemSaleh1" -> "@SalemSaleh1"; any other YouTube link -> "YouTube".
export const youtubeHandle = (url) => (String(url).match(/\/(@[^/?#]+)/) || [])[1] || "YouTube";
