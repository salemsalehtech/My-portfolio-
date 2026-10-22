// apiCache.js — remembers the last answer of each public API request in the visitor's browser
// (localStorage), so the next visit can show the content INSTANTLY while fresh data loads.
//
// Why: the API runs on Render's free plan, which puts the server to sleep after 15 minutes
// without visitors; the first request after that can take ~1 minute. With this cache a returning
// visitor sees the last known content right away, then the sections update when the server
// answers ("stale-while-revalidate"). First-time visitors still wait for the server.
//
// Used by hooks/useCollection.js and components/About.jsx. Never used for admin pages, which
// must always show live data. localStorage can be missing or full (private mode, quota), so
// every access is wrapped in try/catch and simply behaves like "nothing cached".
const PREFIX = "apiCache:v1:"; // bump the version if the shape of cached data ever changes

export function readCache(path) {
  try {
    const raw = localStorage.getItem(PREFIX + path);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache(path, data) {
  try {
    localStorage.setItem(PREFIX + path, JSON.stringify(data));
  } catch {
    /* storage unavailable or full: the next visit just waits for the server */
  }
}
