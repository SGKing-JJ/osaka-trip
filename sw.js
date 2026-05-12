const CACHE = 'osaka-trip-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

// ── 這些網域完全不攔截，直接走網路 ──
const BYPASS_HOSTS = [
  'api.anthropic.com',
  'docs.google.com',
  'sheets.googleapis.com',
  'googleapis.com',
  'accounts.google.com',
  'maps.google.com',
  'cdn.jsdelivr.net',
];

function shouldBypass(url) {
  try {
    const host = new URL(url).hostname;
    return BYPASS_HOSTS.some(h => host === h || host.endsWith('.' + h));
  } catch (e) {
    return false;
  }
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(url =>
        c.add(url).catch(err => console.warn('[SW] skip:', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // 非 GET、外部 API、非 http 全部直接放行
  if (e.request.method !== 'GET') return;
  if (shouldBypass(url)) return;
  if (!url.startsWith('http')) return;

  // 本地資源：Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request.clone()).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
