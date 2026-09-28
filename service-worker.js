/* MRI KCMH — Service Worker (แคชหน้าแอปให้เปิดได้เร็ว/ออฟไลน์) */
const CACHE = 'mri-kcmh-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './favicon.ico',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // ห้ามแคชการเรียก API — ต้องผ่านเน็ตเสมอ (ข้อมูลสด)
  if (url.indexOf('script.google.com') >= 0 || url.indexOf('googleusercontent.com') >= 0) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => {
      // ออฟไลน์และไม่มีในแคช → ถ้าเป็นการเปิดหน้า ให้คืนหน้าแอป
      if (e.request.mode === 'navigate') return caches.match('./index.html');
    }))
  );
});
