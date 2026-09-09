/* Admin shell cache: the app opens instantly and works read-only offline. Data always comes from the network. */
const CACHE = 'uc-admin-shell-v1';
const SHELL = ['./', './index.html', './admin.css', './admin.js', './store.js', './i18n.js', './manifest.webmanifest', '../css/style.css', '../js/config.js', '../js/idb.js', '../images/official/UC-Logo.png', '../images/official/uppercrust_logotype16-w.svg'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== location.origin) return;            // Supabase, CDNs: network only
    if (url.pathname.includes('/content/') || url.pathname.includes('/admin/config')) return;
    e.respondWith(caches.match(e.request).then(hit => {
        const fetched = fetch(e.request).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; }).catch(() => hit);
        return hit || fetched;
    }));
});
