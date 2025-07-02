const APP_VERSION = '1.0.0';
const CACHE_NAME = `ngobras-v${APP_VERSION}`;

// Update urlsToCache with CDN fallbacks
const urlsToCache = [
  '/',
  '/ngobras.html',
  '/chatroom.html',
  '/css/ngobras.css',
  '/css/chatroom.css',
  '/js/app.js',
  '/js/chat.js',
  '/js/ngobras.js',
  '/js/chatroom.js',
  '/js/supabaseClient.js', // Add supabaseClient.js to cache
  '/manifest.json',
  '/offline.html',
  '/images/icons/favicon.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  '/images/icons/apple-touch-icon.png'
];

// CDN resources to cache
const cdnResources = [
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' // Add Supabase CDN
];

// Ganti process.env check dengan window check
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Add after const declarations
let isInstalled = false;

// CONSOLIDATED INSTALL EVENT HANDLER
// Install Service Worker - single handler that combines all install functionality
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install event');
  
  if (isDev) {
    // In development mode, skip caching
    console.log('[ServiceWorker] Development mode - skipping cache');
    self.skipWaiting();
    return;
  }

  // Production mode caching
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
        console.log('[ServiceWorker] Cache opened');
        
        // Track progress
        let loaded = 0;
        const total = urlsToCache.length + cdnResources.length;
        
        // Cache local resources with progress tracking
        console.log('[ServiceWorker] Caching local resources...');
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
            console.error(`[ServiceWorker] Failed to cache ${url}:`, error);
          }
        }
        
        // Cache CDN resources
        console.log('[ServiceWorker] Caching CDN resources...');
        await Promise.all(
          cdnResources.map(async url => {
            try {
              const response = await fetch(url, { mode: 'no-cors' }); // Use no-cors for cross-origin resources
              // Only cache GET requests (Cache API does not support HEAD/POST/PUT)
              if (response && response.type !== 'opaqueredirect') {
                const req = new Request(url, { method: 'GET' });
                await cache.put(req, response);
                loaded++;
              }
            } catch (error) {
              console.warn(`[ServiceWorker] Failed to cache CDN resource: ${url}`, error);
            }
          })
        );

        // Set installation flag
        isInstalled = true;
        
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
        
        // Notify all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'APP_INSTALLED',
            timestamp: new Date().getTime()
          });
        });
        
        console.log('[ServiceWorker] Installation complete');
      } catch (error) {
        console.error('[ServiceWorker] Installation failed:', error);
      }
    })()
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// CONSOLIDATED ACTIVATE EVENT HANDLER
// Activation handler - single handler that combines all activate functionality
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate event');
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(cacheNames => {
        console.log('[ServiceWorker] Cleaning old caches...');
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log(`[ServiceWorker] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Enable navigation preload
      (async () => {
        if (self.registration.navigationPreload) {
          console.log('[ServiceWorker] Enabling navigation preload');
          await self.registration.navigationPreload.enable();
        }
      })(),
      
      // Register periodic sync if available
      (async () => {
        try {
          if ('periodicSync' in self.registration) {
            console.log('[ServiceWorker] Registering periodic sync');
            await self.registration.periodicSync.register('ngobras-installed', {
              minInterval: 24 * 60 * 60 * 1000 // 24 hours
            });
          }
        } catch (error) {
          console.warn('[ServiceWorker] Periodic Sync could not be registered:', error);
        }
      })(),
      
      // Notify clients
      (async () => {
        console.log('[ServiceWorker] Notifying clients of activation');
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'PWA_STATUS',
            status: 'active'
          });
        });
      })()
    ])
    .then(() => {
      console.log('[ServiceWorker] Taking control of clients');
      return self.clients.claim();
    })
  );
});

// CONSOLIDATED FETCH EVENT HANDLER
// Update fetch event handler - improved error handling and CDN support
self.addEventListener('fetch', event => {
  // --- Service Worker fetch event handler with HEAD/GET support and detailed logging ---
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Only handle GET and HEAD requests for cache logic
  if (event.request.method === 'GET' || event.request.method === 'HEAD') {
    event.respondWith((async () => {
      try {
        // Try to get preloaded response
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          return preloadResponse;
        }

        // Check if request is for CDN resource (including Supabase)
        if (event.request.url.includes('cdnjs.cloudflare.com') || 
            event.request.url.includes('cdn.jsdelivr.net')) {
          try {
            // Try network first for CDN
            const networkResponse = await fetch(event.request);
            if (networkResponse && networkResponse.ok) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(event.request, networkResponse.clone());
              // For HEAD, return only headers
              if (event.request.method === 'HEAD') {
                return new Response(null, {
                  status: networkResponse.status,
                  statusText: networkResponse.statusText,
                  headers: networkResponse.headers
                });
              }
              return networkResponse;
            }
            throw new Error('CDN response not ok');
          } catch (error) {
            // If network fails, try cache
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
              if (event.request.method === 'HEAD') {
                return new Response(null, {
                  status: cachedResponse.status,
                  statusText: cachedResponse.statusText,
                  headers: cachedResponse.headers
                });
              }
              return cachedResponse;
            }
            // If no cache, try local fallback
            return await handleCDNFallback(event.request);
          }
        }

        // For API requests, always go to network
        if (event.request.url.includes('/api/')) {
          try {
            return await fetch(event.request);
          } catch (error) {
            // Return a JSON error response for API requests
            return new Response(JSON.stringify({
              error: 'Network error',
              offline: true,
              message: 'You appear to be offline. Please check your connection.'
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }

        // Try cache first for other requests
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          if (event.request.method === 'HEAD') {
            return new Response(null, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: cachedResponse.headers
            });
          }
          return cachedResponse;
        }

        // If not in cache, try network
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            // Only cache successful GET requests
            if (event.request.method === 'GET') {
              try {
                await cache.put(event.request, networkResponse.clone());
              } catch (cacheError) {
                // Log and skip if method is not GET or other cache error
                console.error('[ServiceWorker] Cache put error:', cacheError, {
                  url: event.request.url,
                  method: event.request.method
                });
              }
            }
            if (event.request.method === 'HEAD') {
              return new Response(null, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: networkResponse.headers
              });
            }
            return networkResponse;
          }
          throw new Error('Network response was not ok');
        } catch (error) {
          return handleOfflineFallback(event.request);
        }
      } catch (error) {
        console.error(`[ServiceWorker] Fetch handler error: ${error.message}`);
        return handleOfflineFallback(event.request);
      }
    })());
    return;
  }
  // For other methods (POST, PUT, etc), do not intercept
  // Optionally, could add custom logic here
});

// IMPROVED CDN FALLBACK HANDLER
// Handle CDN fallbacks with better error handling and Supabase support
async function handleCDNFallback(request) {
  // Map CDN URLs to local fallbacks
  const fallbackMap = {
    'bootstrap.min.css': '/css/bootstrap.min.css',
    'bootstrap.bundle.min.js': '/js/bootstrap.bundle.min.js',
    'all.min.css': '/css/fontawesome.min.css',
    'supabase-js@2': '/js/supabaseClient.js' // Use our local supabaseClient.js as fallback
  };

  // Get filename from URL
  const url = new URL(request.url);
  const fileName = url.pathname.split('/').pop();
  
  // Also check for partial matches (like supabase-js@2)
  let fallbackUrl = fallbackMap[fileName];
  
  if (!fallbackUrl) {
    // Try to find a partial match
    for (const [key, value] of Object.entries(fallbackMap)) {
      if (url.pathname.includes(key)) {
        fallbackUrl = value;
        break;
      }
    }
  }

  if (fallbackUrl) {
    const fallbackResponse = await caches.match(fallbackUrl);
    if (fallbackResponse) {
      return fallbackResponse;
    }
  }
  
  // Return appropriate minimal response based on file type
  if (request.url.endsWith('.css')) {
    return new Response('/* Fallback CSS */', {
      headers: { 'Content-Type': 'text/css' }
    });
  } else if (request.url.includes('supabase')) {
    // Minimal Supabase fallback that won't break the app
    return new Response(
      'console.error("[ServiceWorker] Using minimal Supabase fallback"); ' +
      'window.supabase = { createClient: () => { ' +
      'console.error("[Fallback] Supabase createClient called in offline mode"); ' +
      'return { auth: {}, from: () => ({ select: () => ({ data: null, error: { message: "Offline" } }) }) }; } };',
      { headers: { 'Content-Type': 'application/javascript' } }
    );
  } else if (request.url.endsWith('.js')) {
    return new Response('console.warn("Offline fallback JavaScript");', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }

  return new Response('', { status: 200 });
}

// IMPROVED OFFLINE FALLBACK HANDLER
// Handle offline fallback with better content type detection
async function handleOfflineFallback(request) {
  const accept = request.headers.get('Accept') || '';
  const url = new URL(request.url);
  
  // HTML pages
  if (accept.includes('text/html') || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    return caches.match('/offline.html');
  }
  
  // JSON responses (likely API calls)
  if (accept.includes('application/json') || url.pathname.includes('/api/')) {
    return new Response(JSON.stringify({
      error: 'You are currently offline',
      offline: true,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Images
  if (accept.includes('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(url.pathname)) {
    // Try to return a placeholder image from cache
    const placeholder = await caches.match('/images/icons/offline-placeholder.png');
    if (placeholder) return placeholder;
  }
  
  // JavaScript
  if (accept.includes('javascript') || url.pathname.endsWith('.js')) {
    return new Response('console.warn("Offline mode - resource unavailable");', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
  
  // CSS
  if (accept.includes('text/css') || url.pathname.endsWith('.css')) {
    return new Response('/* Offline mode - styles unavailable */', {
      headers: { 'Content-Type': 'text/css' }
    });
  }
  
  // Default empty response
  return new Response('', { status: 200 });
}

// NOTIFICATION CLICK HANDLER
// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open-app') {
    // Open the main app page
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // Check if there is already a window/tab open with the target URL
        for (const client of windowClients) {
          if (client.url.includes('/ngobras') && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('/ngobras.html');
        }
      })
    );
  }
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
