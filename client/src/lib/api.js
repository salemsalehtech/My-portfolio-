// api.js — the ONE place in the app that talks to the backend server over HTTP.
//
// Every component and hook that needs data from (or sends data to) the Express server in
// server/ should call one of the functions exported below (api.get/post/put/patch/del)
// instead of calling fetch() directly. That keeps auth headers, error handling, and the
// server's base URL consistent everywhere.
//
// BASE resolves to VITE_API_URL in production (see client/.env.production) or the local
// "/api" path in dev, which Vite proxies to the server (see client/vite.config.js).
const BASE = import.meta.env.VITE_API_URL || "/api";
// Exported for the few places that need a plain URL instead of a fetch call (e.g. a download link).
export const API_BASE = BASE;

// Internal helper that every api.* method funnels through. It:
//  1. attaches the admin's JWT (if logged in — see AdminContext.jsx) as a Bearer header,
//  2. sends the request and parses the JSON response,
//  3. throws an Error with the server's message whenever the response isn't 2xx, so
//     callers can just try/catch instead of checking res.ok themselves every time.
async function request(path, options = {}) {
  const token = localStorage.getItem("adminToken");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 204) return null; // no-content responses (e.g. successful deletes)
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};
