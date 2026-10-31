// sw.js — the service worker for phone notifications (savings circles, lib/webPush.js).
// It only shows pushed notifications and opens the right page when one is tapped; it does not
// cache anything, so the website always loads fresh.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || "Salem Saleh Tech", {
    body: data.body || "",
    icon: "gam3eya-192.png",
    badge: "gam3eya-192.png",
    dir: "auto",
    data: { url: data.url || "/gam3eya" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = `${self.registration.scope}#${event.notification.data.url}`;
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of open) {
      if (client.url.startsWith(self.registration.scope)) { await client.focus(); return client.navigate(target); }
    }
    return self.clients.openWindow(target);
  })());
});
