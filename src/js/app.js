// Variable to store the PWA install prompt
let deferredPrompt;

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
});

// Listen for the appinstalled event
window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    // After installation, redirect to the app
    setTimeout(() => {
        window.location.href = 'ngobras.html';
    }, 1000);
});

// Function to check if the app is installed
async function isAppInstalled() {
    // Check if running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone || 
        document.referrer.includes('android-app://')) {
        return true;
    }
    
    // Check if it's available for installation
    return !!deferredPrompt;
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful');
            })
            .catch((err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
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

        // Intersection Observer for counter animation
        document.addEventListener('DOMContentLoaded', function() {
            const heroSection = document.querySelector('.hero-section');
            
            if (heroSection) { // Check if element exists
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            animateCounters();
                            observer.unobserve(entry.target);
                        }
                    });
                });

                observer.observe(heroSection);
            }
            
            // Initialize other features
            setTimeout(addChatMessage, 5000);
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

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

        document.addEventListener('DOMContentLoaded', function() {
            // Check if we're on the main page
            const isMainPage = document.querySelector('.chat-demo');
            
            if (isMainPage) {
                // Store the cleanup function
                const cleanup = addChatMessage();
                
                // Clean up when leaving page
                window.addEventListener('unload', () => {
                    if (cleanup) cleanup();
                });
            }

            // Check if we're redirecting from chat button
            const isRedirecting = sessionStorage.getItem('redirecting');
            if (isRedirecting) {
                sessionStorage.removeItem('redirecting');
                return; // Skip initialization if redirecting
            }

            // Smooth scrolling
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
            
            // Initialize chat buttons
            const chatButtons = document.querySelectorAll('[onclick="startChat()"]');
            if (chatButtons) {
                chatButtons.forEach(button => {
                    // Remove inline onclick
                    button.removeAttribute('onclick');
                    // Add event listener
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        startChat();
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

                // Initialize chat demo
                setTimeout(addChatMessage, 5000);
            }
        });

        // Add navbar background on scroll
        window.addEventListener('scroll', function() {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
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

        // Call the initialization function
        document.addEventListener('DOMContentLoaded', () => {
            initSupabase();
        });

        // Function to check if app is in standalone mode
        function isPWAInstalled() {
            return window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone ||
                   document.referrer.includes('android-app://');
        }

        // Function to check if app can be installed
        async function canInstallPWA() {
            return !!deferredPrompt;
        }

        // Request notification permission
        async function requestNotificationPermission() {
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
                    // Show installation prompt
                    const result = await deferredPrompt.prompt();
                    console.log(`Install prompt shown: ${result}`);
                    
                    // Wait for the user's choice
                    const choice = await deferredPrompt.userChoice;
                    
                    if (choice.outcome === 'accepted') {
                        console.log('PWA installation accepted');
                        deferredPrompt = null;
                        // Installation progress will be handled by service worker
                    } else {
                        console.log('PWA installation rejected');
                        window.location.href = 'ngobras.html';
                    }
                } catch (error) {
                    console.error('Install prompt error:', error);
                    window.location.href = 'ngobras.html';
                }
            } else {
                window.location.href = 'ngobras.html';
            }
        }

        // Make startChat available globally
        window.startChat = startChat;