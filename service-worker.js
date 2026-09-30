/* MRI KCMH — Service Worker (แคชหน้าแอปให้เปิดได้เร็ว/ออฟไลน์) */
const CACHE = 'mri-kcmh-v3';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './favicon.ico',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // cache:'reload' = ดึงไฟล์ใหม่จาก GitHub จริง ๆ ไม่ใช้ของเก่าในเบราว์เซอร์
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
  // หน้าแอป (index.html): ดึงของใหม่จาก GitHub ก่อนเสมอ → มือถือได้เวอร์ชันล่าสุดทันทีที่อัปเดต
  // ถ้าเน็ตหลุด/ช้าเกิน 4 วิ ค่อยใช้ของในเครื่อง
  if (e.request.mode === 'navigate') {
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fromCache = () => caches.match('./index.html').then(c => c || caches.match('./'));
      const t = setTimeout(() => fromCache().then(c => { if (c && !done) { done = true; resolve(c); } }), 4000);
      fetch(e.request, { cache: 'no-store' }).then(r => {
        if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        clearTimeout(t); if (!done) { done = true; resolve(r); }
      }).catch(() => { clearTimeout(t); fromCache().then(c => { if (!done) { done = true; resolve(c || Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => {
      // ออฟไลน์และไม่มีในแคช → ถ้าเป็นการเปิดหน้า ให้คืนหน้าแอป
      if (e.request.mode === 'navigate') return caches.match('./index.html');
    }))
  );
});
