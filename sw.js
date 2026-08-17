// Service worker simples — permite instalar o Scan de Protocolo como app
// e deixa a "casca" do app disponível mesmo com internet instável.
// Os dados (fotos, protocolos) sempre exigem internet, pois ficam no Firebase.

const CACHE_NAME = 'tb-protocolo-shell-v1';
const SHELL_FILES = [
  'scan.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'logos/jamef.png',
  'logos/azul.png',
  'logos/correios.png',
  'firebase-config.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never intercept calls to Firebase / Google APIs — always go to the network.
  if (url.origin.includes('googleapis') || url.origin.includes('gstatic') || url.origin.includes('firebase')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
