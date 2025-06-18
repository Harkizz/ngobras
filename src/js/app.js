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

// Store deferredPrompt for later use
let deferredPrompt = null;
let isInstalling = false;

// Update isPWAInstalled function
async function isPWAInstalled() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone) {
        return true;
    }

    // Check installation status in localStorage
    const installStatus = localStorage.getItem('pwa-installed');
    if (installStatus === 'true') {
        // Verify with additional checks
        try {
            const registration = await navigator.serviceWorker.ready;
            if (!registration) {
                localStorage.removeItem('pwa-installed');
                return false;
            }
            return true;
        } catch {
            localStorage.removeItem('pwa-installed');
            return false;
        }
    }

    return false;
}

// Show custom modal
function showCustomModal(title, message, buttonText, buttonAction) {
    const modalHtml = `
        <div class="modal fade" id="pwaModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">${message}</div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                        <button type="button" class="btn btn-primary" id="modalAction">${buttonText}</button>
                    </div>
                </div>
            </div>
        </div>`;

    // Remove existing modal if any
    const existingModal = document.getElementById('pwaModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Get modal instance
    const modalElement = document.getElementById('pwaModal');
    const modal = new bootstrap.Modal(modalElement);

    // Add action button handler
    const actionButton = document.getElementById('modalAction');
    actionButton.addEventListener('click', () => {
        modal.hide();
        buttonAction();
    });

    // Show modal
    modal.show();
}

// Handle PWA installation
async function handlePWAInstallation(e) {
    e.preventDefault();
    
    try {
        // Check if already installed
        const isInstalled = await isPWAInstalled();
        
        if (isInstalled) {
            // Show "already installed" modal
            showCustomModal(
                'Aplikasi Terinstal',
                'Aplikasi NGOBRAS sudah terinstal di perangkat Anda.',
                'Buka Aplikasi',
                () => { window.location.href = 'ngobras.html'; }
            );
            return;
        }

        // Check if installation prompt is available
        if (deferredPrompt) {
            // Show installation modal
            showCustomModal(
                'Instalasi Aplikasi',
                'Untuk pengalaman yang lebih baik, install aplikasi NGOBRAS di perangkat Anda.',
                'Install Sekarang',
                async () => {
                    try {
                        const result = await deferredPrompt.prompt();
                        console.log('Installation prompt result:', result);
                        
                        if (result.outcome === 'accepted') {
                            localStorage.setItem('pwa-installed', 'true');
                            console.log('PWA installation accepted');
                            
                            // Show success modal
                            showCustomModal(
                                'Instalasi Berhasil',
                                'Aplikasi NGOBRAS berhasil diinstal!',
                                'Buka Aplikasi',
                                () => { window.location.href = 'ngobras.html'; }
                            );
                        }
                        
                        deferredPrompt = null;
                    } catch (error) {
                        console.error('Installation error:', error);
                        window.location.href = 'ngobras.html';
                    }
                }
            );
            return;
        }
        
        // If no installation possible, redirect to web version
        window.location.href = 'ngobras.html';
        
    } catch (error) {
        console.error('handlePWAInstallation error:', error);
        window.location.href = 'ngobras.html';
    }
}

// Add installation event listeners
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('Installation prompt ready');
});

window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    localStorage.setItem('pwa-installed', 'true');
});

// When the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add click listeners to all buttons with data-action="start-chat"
    const startChatButtons = document.querySelectorAll('[data-action="start-chat"]');
    startChatButtons.forEach(button => {
        button.addEventListener('click', handlePWAInstallation);
    });
});

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