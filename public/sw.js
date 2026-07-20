/**
 * BlackBox service worker — Web Push + safe activate.
 * Does not unregister itself (unlike the old cache-bust worker).
 */
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', () => {
  // Network-only — do not pin stale UI in caches.
});

function parsePushPayload(event) {
  if (!event.data) {
    return {
      title: 'BlackBox',
      body: 'New notification',
      url: '/',
    };
  }
  try {
    const json = event.data.json();
    return {
      title: String(json.title || 'BlackBox'),
      body: String(json.body || json.message || 'New notification'),
      url: String(json.url || json.link || '/'),
      tag: json.tag ? String(json.tag) : undefined,
    };
  } catch {
    return {
      title: 'BlackBox',
      body: event.data.text() || 'New notification',
      url: '/',
    };
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const options = {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: payload.url },
    tag: payload.tag || 'blackbox',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate?.(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
      return undefined;
    }),
  );
});
