const APP_VERSION = '1.0.0';
const CACHE_NAME = `ngobras-v${APP_VERSION}`;

// Update urlsToCache with CDN fallbacks
const urlsToCache = [
  '/',
  '/ngobras.html',
  '/css/ngobras.css',
  '/js/app.js',
  '/js/chat.js',
  '/js/ngobras.js',
  '/manifest.json',
  '/images/icons/favicon.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png'
];

// CDN resources to cache
const cdnResources = [
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Ganti process.env check dengan window check
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

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

// Update fetch event handler
self.addEventListener('fetch', (event) => {
    // Skip cache in development mode
    if (isDev) {
        return;
    }

  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Check if request is for CDN resource
        if (event.request.url.includes('cdnjs.cloudflare.com')) {
          try {
            // Try network first for CDN
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(event.request, networkResponse.clone());
              return networkResponse;
            }
            throw new Error('CDN response not ok');
          } catch (error) {
            // If network fails, try cache
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache, try local fallback
            return await handleCDNFallback(event.request);
          }
        }

        // For API calls
        if (event.request.url.includes('/api/')) {
          try {
            const networkResponse = await fetch(event.request);
            return networkResponse;
          } catch (error) {
            const cachedResponse = await caches.match(event.request);
            return cachedResponse || new Response(
              JSON.stringify({ error: 'Network error' }), 
              { headers: { 'Content-Type': 'application/json' }}
            );
          }
        }

        // For other requests, try cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, try network
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, networkResponse.clone());
          return networkResponse;
        }

        throw new Error('Network response was not ok');

      } catch (error) {
        console.error('Fetch error:', error);
        return await handleOfflineFallback(event.request);
      }
    })()
  );
});

// Handle CDN fallbacks
async function handleCDNFallback(request) {
  // Map CDN URLs to local fallbacks
  const fallbackMap = {
    'bootstrap.min.css': '/css/bootstrap.min.css',
    'bootstrap.bundle.min.js': '/js/bootstrap.bundle.min.js',
    'all.min.css': '/css/fontawesome.min.css'
  };

  // Get filename from URL
  const fileName = request.url.split('/').pop();
  const fallbackUrl = fallbackMap[fileName];

  if (fallbackUrl) {
    const fallbackResponse = await caches.match(fallbackUrl);
    if (fallbackResponse) {
      return fallbackResponse;
    }
  }

  // Return minimal CSS if everything fails
  if (request.url.endsWith('.css')) {
    return new Response('/* Fallback CSS */', {
      headers: { 'Content-Type': 'text/css' }
    });
  }

  return new Response();
}

// Handle offline fallback
async function handleOfflineFallback(request) {
  if (request.headers.get('Accept').includes('text/html')) {
    return caches.match('/offline.html');
  }
  
  // Return empty response for other resources
  return new Response();
}

// Update install event to cache CDN resources
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        // Cache local resources
        await cache.addAll(urlsToCache);
        // Cache CDN resources
        await Promise.all(
          cdnResources.map(async url => {
            try {
              const response = await fetch(url);
              if (response.ok) {
                await cache.put(url, response);
              }
            } catch (error) {
              console.warn(`Failed to cache CDN resource: ${url}`, error);
            }
          })
        );
      } catch (error) {
        console.error('Installation failed:', error);
      }
    })()
  );
});

// Update activate event to handle cache cleanup
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Enable navigation preload
      Promise.resolve()
        .then(() => {
          if (self.registration.navigationPreload) {
            return self.registration.navigationPreload.enable();
          }
        }),
      // Clean old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
    ])
    .then(() => self.clients.claim()) // Take control immediately
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

// Add development mode cache clearing
if (isDev) {
    self.addEventListener('activate', (event) => {
        event.waitUntil(
            caches.keys()
                .then(cacheNames => {
                    return Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                })
        );
    });
}
