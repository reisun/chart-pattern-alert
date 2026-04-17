// Service Worker for chart-pattern-alert — foreground notification relay.
// No Web Push; only shows notifications triggered from the page via postMessage.

const VERSION = "v1";

self.addEventListener("install", (event) => {
  // Activate immediately so the first page load is controlled after reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "notify" && data.title) {
    const options = {
      body: data.body || "",
      tag: data.tag,
      renotify: false,
      icon: data.icon || undefined,
      badge: data.badge || undefined,
      data: { url: data.url || self.registration.scope, v: VERSION },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        try {
          if (client.url.includes(new URL(targetUrl, self.registration.scope).pathname)) {
            return client.focus();
          }
        } catch { /* ignore */ }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
