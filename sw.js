// تحسين Service Worker للتخزين المؤقت والعمل غير الموصول
// Improved Service Worker for better caching and offline functionality
const CACHE_NAME = 'medical-encyclopedia-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';
// الملفات الأساسية المطلوبة
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
// CDN resources - cache external libraries
const cdnResources = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;800&family=Almarai:wght@400;700;800&family=Cairo:wght@400;600;800&family=Tajawal:wght@400;700;900&display=swap'
];
// Install Event - Cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets...');
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.error('Cache error during install:', error))
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});
// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});
// Fetch Event - Network first strategy for dynamic content, Cache first for static
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Cache first strategy for static assets (images, icons, etc)
  if (request.url.includes('.png') || request.url.includes('.jpg') || request.url.includes('.css') || request.url.includes('.json')) {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  
  // Network first for API and dynamic content
  event.respondWith(
    fetch(request)
      .then(response => {
        // Clone the response
        const clonedResponse = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, clonedResponse))
            .catch(error => console.error('Error caching response:', error));
        }
        
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request)
          .then(response => response || caches.match('./index.html'))
          .catch(() => new Response('Offline - الرجاء التحقق من الاتصال بالإنترنت', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain; charset=utf-8'
            })
          }));
      })
  );
});
// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
// Cache new versions of API responses
self.addEventListener('message', event => {
  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(DYNAMIC_CACHE).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});