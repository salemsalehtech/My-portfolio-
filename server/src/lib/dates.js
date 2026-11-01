// dates.js — dates in the owner's time zone (Cairo), shared by the analytics counters, the team
// due dates and the savings circles. Dates are stored as "YYYY-MM-DD" strings, so comparing two
// of them as plain strings tells which comes first.
const TIME_ZONE = "Africa/Cairo";

// The Cairo date of a moment (default: now), as "YYYY-MM-DD".
const cairoDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);

// The hour in Cairo right now, 0–23.
const cairoHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(new Date()));

// "2026-11-30" + 2 → "2026-12-02".
const addDays = (date, days) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

module.exports = { cairoDate, cairoHour, addDays };
