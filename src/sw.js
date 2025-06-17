const APP_VERSION = '1.0.0';
const CACHE_NAME = `ngobras-v${APP_VERSION}`;
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
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        (async () => {
            try {
                if ('Notification' in self && Notification.permission === 'granted') {
                    await self.registration.showNotification('NGOBRAS', {
                        body: 'Memulai penginstalan aplikasi...',
                        icon: '/images/icons/icon-192x192.png',
                        tag: 'install-progress'
                    });
                }

                const cache = await caches.open(CACHE_NAME);
                await Promise.all(urlsToCache.map(url => cache.add(url)));

                // Mark installation as complete
                if ('Notification' in self && Notification.permission === 'granted') {
                    await self.registration.showNotification('NGOBRAS', {
                        body: 'Aplikasi berhasil diinstall!',
                        icon: '/images/icons/icon-192x192.png',
                        tag: 'install-complete',
                        actions: [{ action: 'open-app', title: 'Buka Aplikasi' }]
                    });
                }
            } catch (error) {
                console.error('Installation failed:', error);
            }
        })()
    );
});

// Activate event handler
self.addEventListener('activate', event => {
    // Clean old caches
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
                );
            })
            .then(() => {
                // Only claim clients after cache cleanup
                return self.clients.claim();
            })
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

    if (event.action === 'reload') {
        event.waitUntil(
            clients.matchAll().then(clients => {
                clients.forEach(client => client.navigate(client.url));
            })
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
      try {
        // Try to use preloaded response first
        const preloadResponse = await Promise.race([
          event.preloadResponse,
          new Promise((_, reject) => setTimeout(() => reject('preload timeout'), 2000))
        ]);
        
        if (preloadResponse) {
          return preloadResponse;
        }

        // Try to get the response from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
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
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('Network error', { 
          status: 408, 
          statusText: 'Network request failed' 
        });
      }
    })()
  );
});

// Activate event handler - Enable navigation preload
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Enable navigation preload
      Promise.resolve()
        .then(() => {
          if (self.registration.navigationPreload) {
            return self.registration.navigationPreload.enable();
          }
        })
        .catch(err => console.error('Navigation preload failed:', err)),

      // Clean old caches  
      caches.keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames
              .filter(cacheName => cacheName !== CACHE_NAME)
              .map(cacheName => caches.delete(cacheName))
          );
        })
    ])
  );
});

// Check for updates
async function checkForUpdates() {
    try {
        const response = await fetch('/manifest.json');
        const manifest = await response.json();
        
        if (manifest.version !== APP_VERSION) {
            // Clear all caches
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            
            // Show update notification
            if (Notification.permission === 'granted') {
                await self.registration.showNotification('NGOBRAS Update', {
                    body: 'Versi baru tersedia. Aplikasi akan diperbarui.',
                    icon: '/images/icons/icon-192x192.png',
                    tag: 'update-available',
                    actions: [{ action: 'reload', title: 'Perbarui Sekarang' }]
                });
            }
            
            // Force reload all clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => client.navigate(client.url));
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
}

// Check for updates periodically
self.addEventListener('periodicsync', event => {
    if (event.tag === 'check-updates') {
        event.waitUntil(checkForUpdates());
    }
});

// Check for updates on push notification
self.addEventListener('push', event => {
    event.waitUntil(checkForUpdates());
});
