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

// Function to check if app is in standalone mode
function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
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

    // First check if already running as PWA
    if (isPWAInstalled()) {
        window.location.href = 'ngobras.html';
        return;
    }

    // Request notification permission
    await requestNotificationPermission();

    // Then check if can be installed
    const installable = await canInstallPWA();
    
    if (installable && deferredPrompt) {
        try {
            isInstalling = true;
            showProgress(0);
            
            // Show installation prompt
            console.log('Showing install prompt...');
            await deferredPrompt.prompt();
            
            // Wait for the user's choice
            const choice = await deferredPrompt.userChoice;
            
            if (choice.outcome === 'accepted') {
                console.log('PWA installation accepted');
                showProgress(50);
                // Installation progress will be handled by service worker
            } else {
                console.log('PWA installation rejected');
                isInstalling = false;
                deferredPrompt = null;
                window.location.href = 'ngobras.html';
            }
        } catch (error) {
            console.error('Install prompt error:', error);
            isInstalling = false;
            window.location.href = 'ngobras.html';
        }
    } else {
        console.log('App cannot be installed or is already installing');
        window.location.href = 'ngobras.html';
    }
}

// Make startChat available globally
window.startChat = startChat;

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