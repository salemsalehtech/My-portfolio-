// analytics.js — sends tiny, anonymous usage events to POST /analytics/event
// (server/src/routes/analytics.js), which only adds +1 to daily counters. No cookies, no ids.
//
//   trackVisit(lang)        once per browser session: device type, language, where they came from
//   track("section", id)    once per session per section that came into view
//   track("project", id)    once per session per project popup opened
//   track("cv")             once per session when the CV is downloaded
//
// Nothing is sent when: running the dev server (npm run dev), the visitor is the logged-in admin
// (so your own visits don't count), or the browser asks not to be tracked (Do Not Track).
// Every failure is silent — analytics must never break or slow down the site.
import { API_BASE } from "./api";

function enabled() {
  if (import.meta.env.DEV) return false;
  try {
    if (localStorage.getItem("adminToken")) return false;
  } catch {
    /* storage blocked: still fine to count */
  }
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return false;
  return true;
}

// true the first time `key` is seen in this browser session, false afterwards.
function firstTimeThisSession(key) {
  try {
    if (sessionStorage.getItem(`analytics:${key}`)) return false;
    sessionStorage.setItem(`analytics:${key}`, "1");
  } catch {
    /* storage blocked: count it anyway */
  }
  return true;
}

export function track(type, name = "", extra = {}) {
  if (!enabled() || !firstTimeThisSession(`${type}:${name}`)) return;
  fetch(`${API_BASE}/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, name, ...extra }),
    keepalive: true, // still delivered if the visitor is leaving the page
  }).catch(() => {});
}

export function trackVisit(lang) {
  track("visit", "", {
    device: window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop",
    lang,
    referrer: document.referrer, // the server keeps only the site name, e.g. "linkedin.com"
  });
}
