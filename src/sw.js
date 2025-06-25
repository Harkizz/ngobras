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

// Add after const declarations
let isInstalled = false;

// Install Service Worker
self.addEventListener('install', event => {
    if (isDev) {
        // In development mode, skip caching
        self.skipWaiting();
        return;
    }

    // Production mode caching
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                await Promise.all(urlsToCache.map(url => cache.add(url)));
            } catch (error) {
                console.error('Installation failed:', error);
            }
        })()
    );
});

// Activation handler
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
                );
            }),
            // Enable navigation preload
            (async () => {
                if (self.registration.navigationPreload) {
                    await self.registration.navigationPreload.enable();
                }
            })(),
            // Notify clients
            (async () => {
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'PWA_STATUS',
                        status: 'active'
                    });
                });
            })()
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

// Update fetch event handler
self.addEventListener('fetch', event => {
    if (isDev) {
        // In development mode, always go to network
        return;
    }

    // Skip chrome-extension requests
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    event.respondWith(
        (async () => {
            try {
                // Try to get preloaded response
                const preloadResponse = await event.preloadResponse;
                if (preloadResponse) {
                    return preloadResponse;
                }

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

                // Try cache first for other requests
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                  return cachedResponse;
                }

                // If not in cache, try network
                const networkResponse = await fetch(event.request);
                if (networkResponse.ok) {
                  const cache = await caches.open(CACHE_NAME);
                  cache.put(event.request, networkResponse.clone());
                  return networkResponse;
                }

                throw new Error('Network response was not ok');

            } catch (error) {
                console.error('Fetch error:', error);
                return handleOfflineFallback(event.request);
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
      (async () => {
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.enable();
        }
      })(),
      // Clean old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
    ])
    .then(() => self.clients.claim())
  );
});

// Add periodic sync registration
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Existing cache cleanup
            caches.keys()
                .then(cacheNames => {
                    return Promise.all(
                        cacheNames
                            .filter(cacheName => cacheName !== CACHE_NAME)
                            .map(cacheName => caches.delete(cacheName))
                    );
                }),
            // Register periodic sync
            (async () => {
                try {
                    if ('periodicSync' in self.registration) {
                        await self.registration.periodicSync.register('ngobras-installed', {
                            minInterval: 24 * 60 * 60 * 1000 // 24 hours
                        });
                    }
                } catch (error) {
                    console.warn('Periodic Sync could not be registered:', error);
                }
            })(),
            // Take control of clients
            self.clients.claim()
        ])
    );
});

// Add uninstall detection
self.addEventListener('uninstall', event => {
    isInstalled = false;
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'APP_UNINSTALLED',
                timestamp: new Date().getTime()
            });
        });
    });
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

// Add periodic check for installation status
self.addEventListener('periodicsync', async (event) => {
    if (event.tag === 'check-install-status') {
        const prevInstallState = isInstalled;
        
        // Check if app is still installed
        const newInstallState = await checkInstallationStatus();
        
        if (prevInstallState && !newInstallState) {
            // App was uninstalled
            isInstalled = false;
            notifyClientsOfUninstall();
        } else if (!prevInstallState && newInstallState) {
            // App was installed
            isInstalled = true;
        }
    }
});

// Add function to check installation status
async function checkInstallationStatus() {
    try {
        // Check if the app is running in standalone mode
        const clients = await self.clients.matchAll();
        const isStandalone = clients.some(client => 
            new URL(client.url).searchParams.has('standalone')
        );
        
        // Check if service worker is still registered
        const registration = await self.registration.getRegistration();
        const hasServiceWorker = !!registration;
        
        return isStandalone && hasServiceWorker;
    } catch (error) {
        console.error('Error checking installation status:', error);
        return false;
    }
}

// Add function to notify clients of uninstall
function notifyClientsOfUninstall() {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'APP_UNINSTALLED',
                timestamp: new Date().getTime()
            });
        });
    });
}

// Add installation status tracking
self.addEventListener('install', event => {
    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                await Promise.all(urlsToCache.map(url => cache.add(url)));
                
                // Set installation flag
                isInstalled = true;
                
                // Notify all clients
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'APP_INSTALLED',
                        timestamp: new Date().getTime()
                    });
                });
            } catch (error) {
                console.error('Installation failed:', error);
            }
        })()
    );
});

// Installation handler
self.addEventListener('install', event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(urlsToCache);
            
            // Notify clients of installation
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'PWA_STATUS',
                    status: 'installed'
                });
            });
        })()
    );
});

// Activation handler
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
                );
            }),
            // Enable navigation preload
            (async () => {
                if (self.registration.navigationPreload) {
                    await self.registration.navigationPreload.enable();
                }
            })(),
            // Notify clients
            (async () => {
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'PWA_STATUS',
                        status: 'active'
                    });
                });
            })()
        ])
    );
});

// Add periodic check for installation status
setInterval(async () => {
    const clients = await self.clients.matchAll();
    if (clients.length === 0) {
        // No clients connected, might be uninstalled
        clients.forEach(client => {
            client.postMessage({
                type: 'PWA_STATUS',
                status: 'uninstalled'
            });
        });
    }
}, 60000); // Check every minute
