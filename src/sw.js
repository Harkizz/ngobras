const CACHE_NAME = 'ngobras-v1';
const urlsToCache = [
  '/ngobras.html',
  '/css/ngobras.css',
  '/js/app.js',
  '/js/chat.js',
  '/js/ngobras.js',
  '/manifest.json',
  '/images/icons/favicon.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Request notification permission
self.addEventListener('activate', async (event) => {
    event.waitUntil(
        Promise.all([
            // Enable navigation preload
            'navigationPreload' in self.registration ?
                self.registration.navigationPreload.enable() : Promise.resolve(),
            
            // Request notification permission
            self.registration.pushManager.getSubscription()
                .then(async (subscription) => {
                    if (Notification.permission !== 'granted') {
                        await Notification.requestPermission();
                    }
                })
        ])
    );
});

// Handle installation status
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            try {
                // Show installation started notification
                if (Notification.permission === 'granted') {
                    await self.registration.showNotification('NGOBRAS', {
                        body: 'Memulai penginstalan aplikasi...',
                        icon: '/images/icons/icon-192x192.png',
                        tag: 'install-progress'
                    });
                }

                const cache = await caches.open(CACHE_NAME);
                console.log('Cache opened');
                
                // Track progress
                let loaded = 0;
                const total = urlsToCache.length;
                
                // Cache files with progress tracking
                for (const url of urlsToCache) {
                    try {
                        await cache.add(url);
                        loaded++;
                        
                        // Update progress notification every 25%
                        if (loaded % Math.ceil(total/4) === 0 && Notification.permission === 'granted') {
                            const progress = Math.round((loaded/total) * 100);
                            await self.registration.showNotification('NGOBRAS', {
                                body: `Menginstal... ${progress}%`,
                                icon: '/images/icons/icon-192x192.png',
                                tag: 'install-progress',
                                renotify: true
                            });
                        }
                    } catch (error) {
                        console.error(`Failed to cache ${url}:`, error);
                    }
                }

                // Show installation complete notification
                if (Notification.permission === 'granted') {
                    await self.registration.showNotification('NGOBRAS', {
                        body: 'Aplikasi berhasil diinstall! Klik untuk membuka.',
                        icon: '/images/icons/icon-192x192.png',
                        tag: 'install-complete',
                        requireInteraction: true,
                        actions: [
                            {
                                action: 'open-app',
                                title: 'Buka Aplikasi'
                            }
                        ]
                    });
                }
            } catch (error) {
                console.error('Installation failed:', error);
            }
        })()
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.notification.tag === 'install-complete' || event.action === 'open-app') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/ngobras.html')
        );
    }
});

// Fetch Service Worker
self.addEventListener('fetch', (event) => {
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    (async () => {
      // Try to get the response from cache first
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        // Try to use preloaded response
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          return preloadResponse;
        }

        // Otherwise, fetch from network
        const networkResponse = await fetch(event.request);
        
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Cache the response if it's from our domain
        if (event.request.url.startsWith(self.location.origin)) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        console.error('Fetch failed:', error);
        return new Response('Network error', { status: 408, statusText: 'Network request failed' });
      }
    })()
  );
});

// Add navigation preload support
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Enable navigation preload if available
            'navigationPreload' in self.registration ?
                self.registration.navigationPreload.enable() : Promise.resolve(),
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.filter(cacheName => {
                        return cacheName !== CACHE_NAME;
                    }).map(cacheName => {
                        return caches.delete(cacheName);
                    })
                );
            })
        ])
    );
});
