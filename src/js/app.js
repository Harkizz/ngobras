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

            // Now check for notification permission
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
            }
        }
    } catch (error) {
        console.error('ServiceWorker registration failed:', error);
    }
}

// Variable to store the PWA install prompt
let deferredPrompt = null;
let isInstalling = false;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    console.log('beforeinstallprompt event was fired and saved');
});

// Listen for the appinstalled event
window.addEventListener('appinstalled', (event) => {
    isInstalling = false;
    deferredPrompt = null;
    
    // Show success message if notifications are permitted
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('NGOBRAS Terinstall', {
            body: 'Aplikasi berhasil diinstall!',
            icon: '/images/icons/icon-192x192.png'
        });
    }

    // Redirect after short delay
    setTimeout(() => {
        window.location.href = 'ngobras.html';
    }, 1000);
});

// Improved PWA installation check
function isPWAInstalled() {
    // Check if running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    
    // Check for iOS standalone mode
    if (window.navigator.standalone) {
        return true;
    }
    
    // Check if installed via manifest
    if (document.referrer.includes('android-app://')) {
        return true;
    }

    // Check if PWA was previously installed
    if (localStorage.getItem('pwa-installed')) {
        return true;
    }

    return false;
}

// Function to check if app can be installed
async function canInstallPWA() {
    return !!deferredPrompt && !isInstalling;
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

// Request notification permission
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
}

// Function to handle chat initiation with notification support
async function startChat(event) {
    if (event) {
        event.preventDefault();
    }

    // Prevent multiple installation attempts
    if (isInstalling) {
        console.log('Installation already in progress');
        return;
    }

    try {
        // First check if already running as PWA
        if (isPWAInstalled()) {
            window.location.href = 'ngobras.html';
            return;
        }

        // Check if installation is possible
        const installable = await canInstallPWA();
        
        if (installable && deferredPrompt) {
            isInstalling = true;
            showProgress(0);
            
            // Show installation prompt
            console.log('Showing install prompt...');
            await deferredPrompt.prompt();
            
            // Wait for the user's choice
            const choice = await deferredPrompt.userChoice;
            
            if (choice.outcome === 'accepted') {
                console.log('PWA installation accepted');
                localStorage.setItem('pwa-installed', 'true');
                showProgress(100);
                
                // Wait a bit before redirecting
                setTimeout(() => {
                    window.location.href = 'ngobras.html';
                }, 1000);
            } else {
                console.log('PWA installation rejected');
                isInstalling = false;
                deferredPrompt = null;
                // Even if rejected, redirect to web version
                window.location.href = 'ngobras.html';
            }
        } else {
            // If can't install (no deferredPrompt), show installation guide
            if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                showIOSInstallGuide();
            } else if (/Android/.test(navigator.userAgent)) {
                showAndroidInstallGuide();
            } else {
                // If not mobile or can't determine, redirect to web version
                window.location.href = 'ngobras.html';
            }
        }
    } catch (error) {
        console.error('Start chat error:', error);
        isInstalling = false;
        window.location.href = 'ngobras.html';
    }
}

// Add installation guides
function showIOSInstallGuide() {
    alert('Untuk menginstal aplikasi di iOS:\n\n' +
          '1. Ketuk tombol "Share" di browser Safari\n' +
          '2. Gulir ke bawah dan ketuk "Add to Home Screen"\n' +
          '3. Ketuk "Add" untuk menginstal');
}

function showAndroidInstallGuide() {
    alert('Untuk menginstal aplikasi di Android:\n\n' +
          '1. Ketuk tombol menu di browser (3 titik)\n' +
          '2. Pilih "Install app" atau "Add to Home screen"\n' +
          '3. Ketuk "Install" untuk melanjutkan');
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
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        }
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
});