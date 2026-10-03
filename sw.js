const CACHE = "neriii-v5";
const SW_VERSION = 5;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put("./", copy));
      return res;
    }).catch(() => caches.match("./")));
    return;
  }
  if (url.searchParams.has("v") || url.pathname.includes("/icons/")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});

self.addEventListener("message", e => {
  if (e.data === "version" && e.source) e.source.postMessage({ type: "version", v: SW_VERSION });
});

self.addEventListener("push", e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { data: { body: e.data ? e.data.text() : "" } }; }
  const d = p.data || (p.notification ? { title: p.notification.title, body: p.notification.body } : p);
  e.waitUntil(self.registration.showNotification(d.title || "Neriii", {
    body: d.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: d.tag || "neriii",
    renotify: true,
    data: { view: d.view || "home", chatWith: d.chatWith || null }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const d = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) {
      c.postMessage({ type: "open", view: d.view, chatWith: d.chatWith });
      if ("focus" in c) return c.focus();
    }
    return self.clients.openWindow("./#" + (d.view || "home"));
  }));
});
