// Check if running in development mode
export const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Register service worker and handle notifications
export async function initializeApp() {
    try {
        if ('serviceWorker' in navigator) {
            // Register new service worker
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            console.log('ServiceWorker registration successful');

            // Add development mode hot reload
            if (isDev) {
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        refreshing = true;
                        window.location.reload();
                    }
                });

                // Clear cache in development mode
                registration.addEventListener('updatefound', () => {
                    clearCacheOnDev();
                });
            }
        }
    } catch (error) {
        console.error('ServiceWorker registration failed:', error);
    }

    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

// Store installation prompt
let deferredPrompt = null;

// Update isPWAInstalled function
export async function isPWAInstalled() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone) {
        return true;
    }

    // Check localStorage
    return localStorage.getItem('pwa-installed') === 'true';
}

// Buat fungsi modal yang lebih fleksibel
function showModal(config) {
    const {title, message, buttonText = 'OK', buttonAction = () => {}} = config;
    
    // Tutup modal yang mungkin masih terbuka
    const existingModal = document.querySelector('.modal.show');
    if (existingModal) {
        const bsModal = bootstrap.Modal.getInstance(existingModal);
        if (bsModal) bsModal.hide();
    }

    // Gunakan ID yang unik untuk setiap jenis modal
    const modalId = `modal-${Date.now()}`;
    
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">${message}</div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                        <button type="button" class="btn btn-primary" id="${modalId}-action">${buttonText}</button>
                    </div>
                </div>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    
    // Event listener untuk membersihkan modal setelah ditutup
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });

    // Setup action button
    const actionButton = modalElement.querySelector(`#${modalId}-action`);
    if (actionButton) {
        actionButton.onclick = () => {
            buttonAction();
            modal.hide();
        };
    }

    modal.show();
}

// Separate installation handler
async function handleInstallClick() {
    try {
        const result = await deferredPrompt.prompt();
        console.log('Install prompt result:', result.outcome);
        
        if (result.outcome === 'accepted') {
            deferredPrompt = null;
            localStorage.setItem('pwa-installed', 'true');
            showModal({
                title: 'Instalasi Berhasil',
                message: 'Aplikasi NGOBRAS berhasil diinstall di perangkat Anda.',
                buttonText: 'OK',
                buttonAction: () => {}
            });
        }
    } catch (error) {
        console.error('Installation failed:', error);
        showModal({
            title: 'Instalasi Gagal',
            message: 'Terjadi kesalahan saat menginstall aplikasi.',
            buttonText: 'OK',
            buttonAction: () => {}
        });
    }
}

// Handle start chat action
async function startChat(event) {
    event.preventDefault();
    
    // Prevent multiple clicks
    const button = event.target;
    if (button.disabled) return;
    button.disabled = true;
    
    try {
        const isInstalled = await isPWAInstalled();
        
        // Close any existing modals first
        const existingModal = document.querySelector('.modal.show');
        if (existingModal) {
            const bsModal = bootstrap.Modal.getInstance(existingModal);
            if (bsModal) bsModal.hide();
        }
        
        if (isInstalled) {
            window.location.href = '/ngobras?action=chat';
        } else if (deferredPrompt) {
            showModal({
                title: 'Install Aplikasi',
                message: 'Untuk pengalaman terbaik, install aplikasi NGOBRAS di perangkat Anda.',
                buttonText: 'Install Sekarang',
                buttonAction: handleInstallClick
            });
        } else {
            window.location.href = '/ngobras?action=chat';
        }
    } catch (error) {
        console.error('Start chat error:', error);
        showModal({
            title: 'Error',
            message: 'Terjadi kesalahan saat memproses permintaan Anda.',
            buttonText: 'OK',
            buttonAction: () => {}
        });
    } finally {
        // Re-enable button after processing
        setTimeout(() => {
            button.disabled = false;
        }, 1000);
    }
}

// Add installation event listeners
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('Installation prompt available');
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    localStorage.setItem('pwa-installed', 'true');
    console.log('PWA installed successfully');
});

// When the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Remove existing listeners first
    const chatButtons = document.querySelectorAll('[data-action="start-chat"]');
    chatButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add new listener with debounce
        let timeoutId;
        newButton.addEventListener('click', (event) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                startChat(event);
            }, 300);
        });
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