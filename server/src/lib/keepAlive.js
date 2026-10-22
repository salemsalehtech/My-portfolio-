// keepAlive.js — keeps the API awake on Render's free plan.
//
// Render puts a free web service to sleep after 15 minutes without incoming requests, and the
// next visitor then waits ~1 minute for it to wake up. While the server is running, this pings
// its own public /api/health address every few minutes, so it never reaches 15 idle minutes.
// (If Render restarts or stops it anyway, the first visitor wakes it up and the pings resume.)
//
// It only runs where a public address is known: Render sets RENDER_EXTERNAL_URL automatically
// for every web service, so on your own computer nothing happens. Options (env vars):
//   KEEP_ALIVE_URL      use this address instead of RENDER_EXTERNAL_URL
//   KEEP_ALIVE_MINUTES  minutes between pings (default 10 — safely under the 15-minute limit)
//   KEEP_ALIVE=off      turn it off
// A free service running all month uses ~744 of Render's 750 free instance hours per month.
function startKeepAlive() {
  const base = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base || process.env.KEEP_ALIVE === "off") return null;

  const minutes = Number(process.env.KEEP_ALIVE_MINUTES) || 10;
  const url = `${base.replace(/\/+$/, "")}/api/health`;

  const ping = () =>
    fetch(url, { signal: AbortSignal.timeout(15000) })
      .then((res) => { if (!res.ok) console.warn(`Keep-alive ping got HTTP ${res.status}`); })
      .catch((err) => console.warn("Keep-alive ping failed:", err.message));

  const timer = setInterval(ping, minutes * 60 * 1000);
  timer.unref(); // never keep the process alive just for this timer
  console.log(`Keep-alive: pinging ${url} every ${minutes} min`);
  return timer;
}

module.exports = { startKeepAlive };
