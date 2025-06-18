// Register service worker and handle notifications
async function initializeApp() {
    try {
        if ('serviceWorker' in navigator) {
            // Register new service worker
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            // Wait for the service worker to be activated
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            // Wait for the service worker to be ready
            await navigator.serviceWorker.ready;
            console.log('ServiceWorker registration successful');
        }
    } catch (error) {
        console.error('ServiceWorker registration failed:', error);
    }

    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

// Variable to store the PWA install prompt
let deferredPrompt = null;
let isInstalling = false;

// When the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add click listeners to all buttons with data-action="start-chat"
    const startChatButtons = document.querySelectorAll('[data-action="start-chat"]');
    startChatButtons.forEach(button => {
        button.addEventListener('click', startChat);
    });
});

// Listen for beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Clear any existing installation flags
    localStorage.removeItem('pwa-installed');
    console.log('beforeinstallprompt captured, installation status reset');
});

// Update startChat function
async function startChat(event) {
    if (event) {
        event.preventDefault();
    }

    console.log('startChat triggered');

    if (isInstalling) {
        console.log('Installation already in progress');
        return;
    }

    try {
        if (isPWAInstalled()) {
            console.log('App is already installed');
            showInstalledModal();
            return;
        }

        if (!deferredPrompt) {
            console.log('No installation prompt available');
            // Redirect to web version if can't install
            window.location.href = 'ngobras.html';
            return;
        }

        console.log('Triggering install prompt');
        isInstalling = true;

        // Show the install prompt
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        console.log('User choice:', choiceResult.outcome);
        
        if (choiceResult.outcome === 'accepted') {
            localStorage.setItem('pwa-installed', 'true');
            showProgress(100);
            setTimeout(() => {
                window.location.href = 'ngobras.html';
            }, 1000);
        } else {
            // Even if user cancels, redirect to web version
            window.location.href = 'ngobras.html';
        }

        // Reset the prompt variable
        deferredPrompt = null;
        isInstalling = false;

    } catch (error) {
        console.error('Installation error:', error);
        isInstalling = false;
        window.location.href = 'ngobras.html';
    }
}

// Update isPWAInstalled function
async function isPWAInstalled() {
    // Check localStorage timestamp
    const lastUninstallCheck = localStorage.getItem('last-uninstall-check');
    const currentTime = new Date().getTime();
    
    if (lastUninstallCheck) {
        const timeSinceLastCheck = currentTime - parseInt(lastUninstallCheck);
        if (timeSinceLastCheck < 60000) { // Within last minute
            const wasUninstalled = localStorage.getItem('was-uninstalled') === 'true';
            if (wasUninstalled) {
                return false;
            }
        }
    }
    
    // Update last check timestamp
    localStorage.setItem('last-uninstall-check', currentTime.toString());

    // Traditional checks
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    
    if (window.navigator.standalone) {
        return true;
    }

    // Check service worker registration
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                return false;
            }
        } catch (error) {
            console.warn('Service worker check failed:', error);
            return false;
        }
    }

    return false;
}

// Add uninstall detection listener
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'APP_UNINSTALLED') {
            console.log('App uninstall detected');
            localStorage.setItem('was-uninstalled', 'true');
            localStorage.removeItem('pwa-installed');
            deferredPrompt = null;

            // Force reload after short delay
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    });
}

// Add beforeinstallprompt handler
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Reset installation flags
    localStorage.removeItem('pwa-installed');
    localStorage.removeItem('was-uninstalled');
    console.log('Installation prompt ready');
});

// Show installed modal
function showInstalledModal() {
    const modal = new bootstrap.Modal(document.getElementById('appInstalledModal'));
    modal.show();
}

// Open installed app
function openInstalledApp() {
    const appUrl = window.location.origin + '/ngobras.html';
    window.location.href = appUrl;
}

// Function to show installation progress
function showProgress(progress) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('NGOBRAS Installing', {
            body: `Installing... ${progress}%`,
            icon: '/images/icons/icon-192x192.png',
            tag: 'install-progress'
        });
    }
}

// Handle installation
async function handleInstallation() {
    if (!deferredPrompt) {
        // Redirect to web version if installation not possible
        window.location.href = 'ngobras.html';
        return;
    }

    try {
        isInstalling = true;
        showProgress(0);
        
        // Show installation prompt
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        
        if (choice.outcome === 'accepted') {
            localStorage.setItem('pwa-installed', 'true');
            showProgress(100);
            setTimeout(() => {
                window.location.href = 'ngobras.html';
            }, 1000);
        } else {
            isInstalling = false;
            deferredPrompt = null;
            // Redirect even if installation rejected
            window.location.href = 'ngobras.html';
        }
    } catch (error) {
        console.error('Installation error:', error);
        isInstalling = false;
        window.location.href = 'ngobras.html';
    }
}

// JavaScript for the index.html page
// Counter Animation
function animateCounters() {
    const counters = document.querySelectorAll('.stats-counter');
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const increment = target / 100;
        let current = 0;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                counter.textContent = Math.ceil(current);
                setTimeout(updateCounter, 50);
            } else {
                counter.textContent = target;
            }
        };
        
        updateCounter();
    });
}

// Dynamic chat messages
function addChatMessage() {
    const chatDemo = document.querySelector('.chat-demo');
    // Hentikan fungsi jika elemen tidak ditemukan
    if (!chatDemo) {
        return;
    }

    const messages = [
        "Hai! Apa yang bisa saya bantu?",
        "Saya siap membantu masalah Anda",
        "Konsultasi dengan ahli kami sekarang"
    ];
    
    let currentIndex = 0;

    function updateMessage() {
        const messageElement = chatDemo.querySelector('.message-text');
        if (!messageElement) return; // Safety check

        messageElement.textContent = messages[currentIndex];
        currentIndex = (currentIndex + 1) % messages.length;
    }

    // Jalankan interval hanya jika elemen ditemukan
    const intervalId = setInterval(updateMessage, 3000);

    // Cleanup function untuk menghentikan interval
    return () => clearInterval(intervalId);
}

// Main initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize service worker and notifications
    initializeApp();
    
    // Initialize Supabase client
    initSupabase();
    
    // Check if we're redirecting from chat button
    const isRedirecting = sessionStorage.getItem('redirecting');
    if (isRedirecting) {
        sessionStorage.removeItem('redirecting');
        return; // Skip initialization if redirecting
    }

    // Initialize chat buttons
    const chatButtons = document.querySelectorAll('[data-action="start-chat"]');
    if (chatButtons) {
        chatButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                startChat(e);
            });
        });
    }
    
    // Only initialize these features if we're on the main page
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        // Set up counter animation observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounters();
                    observer.unobserve(entry.target);
                }
            });
        });
        observer.observe(heroSection);

        // Initialize chat demo with cleanup
        const cleanup = addChatMessage();
        if (cleanup) {
            window.addEventListener('unload', cleanup);
        }
    }

    // Initialize smooth scrolling
    const navLinks = document.querySelectorAll('a[href^="#"]');
    if (navLinks) {
        navLinks.forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                // Only do smooth scroll for page sections, not for actions
                if (href !== '#' && href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }
});

// Add navbar background on scroll
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Initialize Supabase client
const initSupabase = async () => {
    try {
        const response = await fetch('/api/test');
        const data = await response.json();
        console.log('Data from Supabase:', data);
    } catch (error) {
        console.error('Error:', error);
    }
};

// Listen for display mode changes
window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
    if (evt.matches) {
        localStorage.setItem('pwa-installed', 'true');
    }
});

// Check if launched from homescreen
window.addEventListener('load', () => {
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
        localStorage.setItem('pwa-installed', 'true');
    }
    
    // Clear cache in development mode
    clearCacheOnDev();
});

// Listen for the appinstalled event
window.addEventListener('appinstalled', (event) => {
    isInstalling = false;
    deferredPrompt = null;
    localStorage.setItem('pwa-installed', 'true');
    
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('NGOBRAS Terinstall', {
            body: 'Aplikasi berhasil diinstall!',
            icon: '/images/icons/icon-192x192.png'
        });
    }
});

// Add after initializeApp function
async function clearCacheOnDev() {
    // Ganti process.env check dengan window check
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        try {
            // Clear all caches
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('Cache cleared in development mode');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }
}

// Add message listener for uninstall detection
navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'APP_UNINSTALLED') {
        console.log('App uninstall detected');
        localStorage.removeItem('pwa-installed');
        deferredPrompt = null;
        // Refresh page to update installation status
        window.location.reload();
    }
});