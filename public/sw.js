// Service worker minimal — installabilité PWA (mise en cache réelle en V2).
const CACHE = 'reggenerate-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Pass-through pour l'instant (réseau d'abord). Stratégie de cache à définir en V2.
});
