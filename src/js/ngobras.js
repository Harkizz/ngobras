// ===== NAVIGATION FUNCTIONS =====
        

/**
 * setActiveNav
 * Fungsi untuk mengatur state aktif pada bottom navigation.
 * Akan menghapus class 'active' dari semua .nav-item, lalu menambahkannya ke elemen yang diberikan.
 * @param {Element|null} element - Element nav yang diklik/dituju (bisa null)
 * @param {string} page - Nama halaman yang akan diaktifkan ('home' | 'profile')
 */
function setActiveNav(element, page) {
    try {
        // Hapus class 'active' dari semua nav-item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        // Tambahkan class 'active' ke elemen yang diberikan
        if (element && element.classList) {
            element.classList.add('active');
        } else {
            // Fallback: cari berdasarkan id
            let navId = page === 'profile' ? 'nav-profile' : 'nav-home';
            const fallbackEl = document.getElementById(navId);
            if (fallbackEl) {
                fallbackEl.classList.add('active');
            } else {
                console.warn('[setActiveNav] Tidak dapat menemukan elemen nav untuk page:', page);
            }
        }
    } catch (err) {
        console.error('[setActiveNav] Error saat mengatur nav aktif:', err);
    }
}

        /**
         * Async: Pastikan Supabase sudah siap sebelum render UI
         * @returns {Promise<boolean>} true jika sukses, false jika gagal
         */
        async function ensureSupabaseReady() {
            // Cek apakah sudah ada window.getSupabaseClient
            if (typeof window.getSupabaseClient !== 'function') {
                console.error('[NGOBRAS] getSupabaseClient() tidak ditemukan di window. Pastikan supabaseClient.js sudah dimuat.');
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.innerHTML = `<div class='error-container'><h3>Supabase Client Error</h3><div class='error-details'>getSupabaseClient() tidak ditemukan. Pastikan supabaseClient.js sudah dimuat sebelum ngobras.js.</div></div>`;
                }
                return false;
            }
            // Cek apakah sudah pernah diinisialisasi
            if (window.__ngobrasSupabaseClient) return true;
            try {
                // Inisialisasi Supabase client
                const client = await window.getSupabaseClient();
                if (!client) throw new Error('getSupabaseClient() mengembalikan null/undefined');
                window.__ngobrasSupabaseClient = client;
                return true;
            } catch (err) {
                console.error('[NGOBRAS] Gagal inisialisasi Supabase:', err);
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.innerHTML = `<div class='error-container'><h3>Supabase Init Error</h3><div class='error-details'>${err.message}</div></div>`;
                }
                return false;
            }
        }

        /**
         * Fungsi utama untuk handle navigasi dan render konten utama
         * @param {string} page - 'home' | 'profile'
         * @param {boolean} [fromHash] - true jika dipanggil dari hashchange
         *
         * Setiap navigasi ke 'home', selalu render ulang struktur home dan load ulang chat items dinamis (AI & Admin)
         * Error handling diperkuat, log detail, dan UI error jelas.
         */
        async function handleNavigation(page, fromHash = false) {
            const mainContent = document.querySelector('.main-content');
            try {
                console.log('[NAVIGATION] handleNavigation:', page, 'fromHash:', fromHash);
                // Pastikan Supabase sudah siap sebelum render UI
                const supabaseReady = await ensureSupabaseReady();
                if (!supabaseReady) return;
                // Update nav active state
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                let navId = page === 'profile' ? 'nav-profile' : 'nav-home';
                const navEl = document.getElementById(navId);
                if (navEl) navEl.classList.add('active');
                // Clear main content
                if (mainContent) mainContent.innerHTML = '';
                // Render sesuai page
                if (page === 'home') {
                    if (!fromHash) window.location.hash = 'home';
                    // Render struktur dasar home (tanpa dummy)
                    renderHomeContent();
                    // Setelah struktur dasar dirender, load chat items dinamis
                    try {
                        await loadChatItems();
                        console.log('[NGOBRAS] Chat items loaded (AI & Admin)');
                    } catch (err) {
                        console.error('[handleNavigation] Error loading chat items:', err);
                        if (mainContent) {
                            mainContent.innerHTML += `<div class='error-container'><h3>Load Chat Items Error</h3><div class='error-details'>${err.message}</div><div class='error-debug'>${err.stack}</div></div>`;
                        }
                    }
                } else if (page === 'profile') {
                    if (!fromHash) window.location.hash = 'profile';
                    if (typeof window.handleProfilePage === 'function') {
                        try {
                            window.handleProfilePage();
                            console.log('[NAVIGATION] Profile page rendered');
                        } catch (profileError) {
                            console.error('[NAVIGATION] Error in handleProfilePage:', profileError);
                            if (mainContent) {
                                mainContent.innerHTML += `<div class='error-container'><h3>Profile Error</h3><div class='error-details'>${profileError.message}</div><div class='error-debug'>${profileError.stack}</div></div>`;
                            }
                        }
                    } else {
                        if (mainContent) mainContent.innerHTML = '<div class="error-container"><h3>Profile Error</h3><div class="error-details">Profile page renderer not found.</div></div>';
                    }
                } else {
                    if (mainContent) mainContent.innerHTML = '<div class="error-container"><h3>404</h3><div class="error-details">Halaman tidak ditemukan.</div></div>';
                }
            } catch (err) {
                console.error('[NAVIGATION] Error in handleNavigation:', err);
                if (mainContent) {
                    mainContent.innerHTML = `<div class='error-container'><h3>Navigation Error</h3><div class='error-details'>${err.message}</div><div class='error-debug'>${err.stack}</div></div>`;
                }
            }
        }

        // ===== BOTTOM NAVIGATION EVENT HANDLER & HASHCHANGE =====
        document.addEventListener('DOMContentLoaded', function() {
            // Event handler untuk bottom nav
            const navHome = document.getElementById('nav-home');
            if (navHome) {
                navHome.addEventListener('click', function(e) {
                    e.preventDefault();
                    // Selalu trigger render ulang meski hash sama
                    handleNavigation('home', false);
                });
            }
            const navProfile = document.getElementById('nav-profile');
            if (navProfile) {
                navProfile.addEventListener('click', function(e) {
                    e.preventDefault();
                    handleNavigation('profile', false);
                });
            }
            // Hashchange untuk navigasi via browser
            window.addEventListener('hashchange', function() {
                let page = 'home';
                if (window.location.hash === '#profile') page = 'profile';
                handleNavigation(page, true);
            });
            // Initial render sesuai hash
            let initialPage = 'home';
            if (window.location.hash === '#profile') initialPage = 'profile';
            handleNavigation(initialPage, true);
        });

        /**
         * Function untuk menangani navigasi antar halaman
         * @param {string} page - Nama halaman yang akan ditampilkan
         */
        /**
         * Function untuk menangani navigasi antar halaman
         * @param {string} page - Nama halaman yang akan ditampilkan
         */

        // ===== CENTRALIZED NAVIGATION EVENT LISTENERS =====
        // Remove legacy/duplicate nav event listeners if any
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                // Debug: DOMContentLoaded triggered
                console.log('[NGOBRAS] DOMContentLoaded');
                updateOnlineStatus();

                // --- NAVIGATION HANDLING ---
                // Remove all nav-item click listeners first (defensive)
                document.querySelectorAll('.nav-item').forEach(item => {
                    const newItem = item.cloneNode(true);
                    item.parentNode.replaceChild(newItem, item);
                });

                // Add single click handler for nav-home
                const navHome = document.getElementById('nav-home');
                if (navHome) {
                    navHome.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (window.location.hash === '#home') {
                            handleNavigation('home');
                        } else {
                            window.location.hash = 'home';
                        }
                    });
                }
                // Add single click handler for nav-profile
                const navProfile = document.getElementById('nav-profile');
                if (navProfile) {
                    navProfile.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (window.location.hash === '#profile') {
                            handleNavigation('profile');
                        } else {
                            window.location.hash = 'profile';
                        }
                    });
                }

                // Centralized hashchange handler
                window.addEventListener('hashchange', function() {
                    const hash = window.location.hash.replace('#', '') || 'home';
                    handleNavigation(hash, true);
                });

                // Initial render sesuai hash, TUNGGU Supabase siap
                const initialHash = window.location.hash.replace('#', '') || 'home';
                await handleNavigation(initialHash, true);

                // Initialize fade-in animation untuk elemen
                const fadeElements = document.querySelectorAll('.fade-in');
                fadeElements.forEach((element, index) => {
                    element.style.animationDelay = `${index * 0.1}s`;
                });
            } catch (err) {
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.innerHTML = `<div class='error-container'><h3>Critical Error</h3><div class='error-details'>${err.message}</div></div>`;
                }
                console.error('[NGOBRAS] Critical error on DOMContentLoaded:', err);
            }
        });

        // ===== CHAT FUNCTIONS =====
        
        /**
         * Function untuk membuka chat berdasarkan tipe dan ID
         * @param {string} chatId - ID unik untuk chat yang akan dibuka
         */
        function openChat(chatId) {
            // Tambahkan loading state ke chat item yang diklik
            const clickedItem = event.currentTarget;
            clickedItem.classList.add('loading');
            
            // Simulasi loading (dalam implementasi nyata, ini akan melakukan API call)
            setTimeout(() => {
                clickedItem.classList.remove('loading');
                
                // Log untuk debugging
                console.log('Opening chat:', chatId);
                
                // Di sini akan ada logika untuk:
                // 1. Redirect ke halaman chat
                // 2. Load chat history
                // 3. Initialize chat 
                
                // Contoh implementasi sederhana:
                handleChatOpen(chatId);
            }, 500);
        }

        /**
         * Function untuk menangani pembukaan chat
         * @param {string} chatId - ID chat yang akan dibuka
         */
        function handleChatOpen(chatId) {
            // Ambil user id dari session
            const session = getUserSessionFromLocalStorage();
            const userId = session && session.user && session.user.id ? session.user.id : null;

            // Tentukan adminId dari chatId (misal: 'doctor-general', 'doctor-pediatric', 'admin-support')
            let adminId = null;
            if (chatId.startsWith('doctor-')) {
                adminId = chatId.replace('doctor-', '');
            } else if (chatId.startsWith('admin-')) {
                adminId = chatId.replace('admin-', ''); // Ambil hanya UUID admin
            } else if (chatId === 'admin-support') {
                adminId = 'support';
            } else {
                // Untuk AI chat, bisa diarahkan ke AI, atau abaikan
                adminId = chatId;
            }

            if (userId && adminId) {
                // Redirect ke halaman chatroom dengan parameter user_id dan admin_id
                window.location.href = `chatroom.html?user_id=${encodeURIComponent(userId)}&admin_id=${encodeURIComponent(adminId)}`;
            } else {
                alert('Gagal membuka chat: user belum login atau admin tidak valid.');
            }
        }

        // ===== UTILITY FUNCTIONS =====
        
        /**
         * Function untuk menampilkan notifikasi toast
         * @param {string} message - Pesan yang akan ditampilkan
         * @param {string} type - Tipe notifikasi (success, error, info)
         */
        function showToast(message, type = 'info') {
            // Implementasi sederhana toast notification
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Dalam implementasi nyata, bisa menggunakan library toast
            // atau membuat custom toast component
        }
        
        // Make showToast available globally for other modules
        window.showToast = showToast;

        /**
         * Function untuk handle online/offline status
         */
        function updateOnlineStatus() {
            const onlineElements = document.querySelectorAll('.chat-time');
            const isOnline = navigator.onLine;
            
            onlineElements.forEach(element => {
                if (element.textContent === 'Online' || element.textContent === 'Offline') {
                    element.textContent = isOnline ? 'Online' : 'Offline';
                    element.style.color = isOnline ? 'var(--primary-color)' : 'var(--text-secondary)';
                }
            });
        }

        // ===== EVENT LISTENERS =====
        
        // Event listener untuk perubahan status online/offline
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Event listener untuk DOM content loaded
        document.addEventListener('DOMContentLoaded', function() {
            try {
                // Debug: DOMContentLoaded triggered
                console.log('[NGOBRAS] DOMContentLoaded');
                updateOnlineStatus();

                // Animasi klik chat item
                const chatItems = document.querySelectorAll('.chat-item');
                chatItems.forEach(item => {
                    item.addEventListener('click', function() {
                        this.style.transform = 'scale(0.98)';
                        setTimeout(() => {
                            this.style.transform = '';
                        }, 150);
                    });
                });

                // --- NAVIGATION HANDLING ---
                function updateNavFromHash() {
                    const hash = window.location.hash.replace('#', '') || 'home';
                    let navId = hash === 'profile' ? 'nav-profile' : 'nav-home';
                    const navEl = document.getElementById(navId);
                    setActiveNav(navEl, hash);
                }

                // Inisialisasi nav aktif saat load
                updateNavFromHash();

                // Render home secara eksplisit jika hash kosong atau #home
                if (!window.location.hash || window.location.hash === '#home') {
                    try {
                        renderHomeContent();
                        console.log('[NGOBRAS] Home rendered on initial load');
                    } catch (err) {
                        const mainContent = document.querySelector('.main-content');
                        if (mainContent) {
                            mainContent.innerHTML = `<div class='error-container'><h3>Gagal menampilkan halaman utama</h3><div class='error-details'>${err.message}</div></div>`;
                        }
                        console.error('[NGOBRAS] Error rendering home on load:', err);
                    }
                }

                // Update nav aktif saat hash berubah
                window.addEventListener('hashchange', function() {
                    updateNavFromHash();
                });

                // Klik nav: update hash dan render ulang meski hash sama
                document.getElementById('nav-home').addEventListener('click', function(e) {
                    e.preventDefault();
                    if (window.location.hash === '#home') {
                        setActiveNav(this, 'home');
                        renderHomeContent();
                    } else {
                        window.location.hash = 'home';
                    }
                });
                document.getElementById('nav-profile').addEventListener('click', function(e) {
                    e.preventDefault();
                    if (window.location.hash === '#profile') {
                        setActiveNav(this, 'profile');
                        if (typeof window.handleProfilePage === 'function') {
                            window.handleProfilePage();
                        }
                    } else {
                        window.location.hash = 'profile';
                    }
                });

                // Initialize fade-in animation untuk elemen
                const fadeElements = document.querySelectorAll('.fade-in');
                fadeElements.forEach((element, index) => {
                    element.style.animationDelay = `${index * 0.1}s`;
                });
            } catch (err) {
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.innerHTML = `<div class='error-container'><h3>Critical Error</h3><div class='error-details'>${err.message}</div></div>`;
                }
                console.error('[NGOBRAS] Critical error on DOMContentLoaded:', err);
            }
        });

        // ===== PWA SUPPORT =====
        
        // Variables for PWA
        // Note: deferredPrompt is already declared in app.js
        let isInstalled = false;
        
        // Service Worker registration untuk PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                        console.log('SW registered: ', registration);
                        checkPWAStatus();
                    })
                    .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                        // Show error in UI if needed
                        showPWAError();
                    });
            });
        }
        
        /**
         * Check if app is already installed as PWA
         * @returns {boolean} True if app is installed as PWA
         */
        function isPWAInstalled() {
            // Check if running in standalone mode (installed PWA)
            if (window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone) {
                return true;
            }
            
            // Check localStorage flag (set when user installs)
            if (localStorage.getItem('pwa-installed') === 'true') {
                return true;
            }
            
            return false;
        }
        
        /**
         * Show PWA installation error in UI
         */
        function showPWAError() {
            const errorBanner = document.createElement('div');
            errorBanner.className = 'pwa-error-banner';
            errorBanner.innerHTML = `
                <div class="pwa-error-content">
                    <i class="bi bi-exclamation-triangle"></i>
                    <span>Terjadi kesalahan saat memuat Service Worker. Beberapa fitur mungkin tidak berfungsi.</span>
                    <button onclick="this.parentNode.parentNode.remove()">×</button>
                </div>
            `;
            document.body.appendChild(errorBanner);
        }
        
        /**
         * Show PWA installation promotion banner
         */
        function showInstallPromotion() {
            // Don't show if already installed or banner exists
            if (isPWAInstalled() || document.querySelector('.pwa-install-banner')) {
                return;
            }
            
            const installBanner = document.createElement('div');
            installBanner.className = 'pwa-install-banner';
            installBanner.innerHTML = `
                <div class="pwa-install-content">
                    <div class="pwa-install-icon">
                        <img src="/images/icons/icon-192x192.png" alt="NGOBRAS">
                    </div>
                    <div class="pwa-install-text">
                        <strong>Instal NGOBRAS</strong>
                        <span>Akses lebih cepat tanpa browser</span>
                    </div>
                    <button id="pwa-install-button" class="pwa-install-button">Instal</button>
                    <button class="pwa-dismiss-button" onclick="dismissInstallPromotion()">×</button>
                </div>
            `;
            document.body.appendChild(installBanner);
            
            // Add event listener to install button
            document.getElementById('pwa-install-button').addEventListener('click', installPWA);
        }
        
        /**
         * Hide PWA installation promotion banner
         */
        function hideInstallPromotion() {
            const banner = document.querySelector('.pwa-install-banner');
            if (banner) {
                banner.remove();
            }
        }
        
        /**
         * Dismiss PWA installation promotion and remember choice
         */
        function dismissInstallPromotion() {
            hideInstallPromotion();
            // Remember user dismissed for 7 days
            const now = new Date();
            const expiry = now.getTime() + (7 * 24 * 60 * 60 * 1000);
            localStorage.setItem('pwa-install-dismissed', expiry.toString());
        }
        
        /**
         * Install PWA when user clicks install button
         */
        function installPWA() {
            if (!deferredPrompt) {
                console.log('No installation prompt available');
                return;
            }
            
            // Show browser install prompt
            deferredPrompt.prompt();
            
            // Wait for user to respond to prompt
            deferredPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    localStorage.setItem('pwa-installed', 'true');
                    hideInstallPromotion();
                    isInstalled = true;
                } else {
                    console.log('User dismissed the install prompt');
                }
                // Clear the deferredPrompt so it can be garbage collected
                deferredPrompt = null;
            });
        }
        
        /**
         * Check PWA status and show promotion if appropriate
         */
        function checkPWAStatus() {
            // Check if already installed
            isInstalled = isPWAInstalled();
            
            if (isInstalled) {
                // App is already installed, update UI if needed
                document.body.classList.add('pwa-mode');
                return;
            }
            
            // Check if user previously dismissed
            const dismissedUntil = localStorage.getItem('pwa-install-dismissed');
            if (dismissedUntil && parseInt(dismissedUntil) > new Date().getTime()) {
                // User dismissed recently, don't show again yet
                return;
            }
            
            // Listen for beforeinstallprompt event to show custom UI
            window.addEventListener('beforeinstallprompt', (e) => {
                // Prevent Chrome 76+ from showing the mini-infobar
                e.preventDefault();
                // Stash the event so it can be triggered later
                deferredPrompt = e;
                // Show install promotion after a delay
                setTimeout(() => {
                    showInstallPromotion();
                }, 3000);
            });
            
            // Listen for app installed event
            window.addEventListener('appinstalled', (evt) => {
                console.log('NGOBRAS was installed');
                localStorage.setItem('pwa-installed', 'true');
                hideInstallPromotion();
                isInstalled = true;
                
                // Show success message
                showToast('NGOBRAS berhasil diinstal!', 'success');
            });
        }

        // ===== CHAT ITEMS LOADING FUNCTIONS =====
        
        /**
         * Fetch AI assistants from the backend API
         * @returns {Promise<Array>} List of AI assistants
         */
        async function fetchAIAssistants() {
            try {
                const response = await fetch('/api/ai-assistants');
                if (!response.ok) throw new Error('Failed to fetch AI assistants');
                return await response.json();
            } catch (error) {
                console.error('Error fetching AI assistants:', error);
                return [];
            }
        }

        /**
         * Fetch admin profiles from the backend API
         * @returns {Promise<Array>} List of admin profiles
         */
        async function fetchAdmins() {
            try {
                const response = await fetch('/api/admins');
                if (!response.ok) throw new Error('Failed to fetch admins');
                return await response.json();
            } catch (error) {
                console.error('Error fetching admins:', error);
                return [];
            }
        }

        /**
         * Helper to create a chat item DOM element
         * @param {Object} options - Chat item options (type, id, name, subtitle, avatar, online, uuid)
         * @returns {HTMLElement} Chat item element
         */
        function createChatItem({ type, id, name, subtitle, avatar, online = true, uuid }) {
            // Create main chat item div
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.onclick = () => openChat(`${type}-${id}`);
            // Simpan UUID admin sebagai attribute jika type admin
            if (type === 'admin' && uuid) {
                item.setAttribute('data-admin-uuid', uuid);
                console.log('[createChatItem] Render admin chat item:', name, 'uuid:', uuid);
            }
            // Avatar
            const avatarDiv = document.createElement('div');
            avatarDiv.className = `chat-avatar ${type === 'ai' ? 'ai-avatar' : 'admin-avatar'}`;
            if (avatar) {
                if (avatar.startsWith('bi ')) {
                    // Bootstrap icon
                    const icon = document.createElement('i');
                    icon.className = avatar;
                    avatarDiv.appendChild(icon);
                } else {
                    // Image
                    const img = document.createElement('img');
                    img.src = avatar;
                    img.alt = name;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.borderRadius = '50%';
                    avatarDiv.appendChild(img);
                }
            }
            // Chat info
            const infoDiv = document.createElement('div');
            infoDiv.className = 'chat-info';
            const titleDiv = document.createElement('div');
            titleDiv.className = 'chat-title';
            titleDiv.textContent = name;
            const previewDiv = document.createElement('div');
            previewDiv.className = 'chat-preview';
            previewDiv.textContent = subtitle || '';
            infoDiv.appendChild(titleDiv);
            infoDiv.appendChild(previewDiv);
            // Chat time/status
            const timeDiv = document.createElement('div');
            timeDiv.className = 'chat-time';
            timeDiv.textContent = online ? 'Online' : 'Offline';
            // Compose item
            item.appendChild(avatarDiv);
            item.appendChild(infoDiv);
            item.appendChild(timeDiv);
            return item;
        }

        /**
         * Render AI assistants as chat items in the AI section
         * @param {Array} assistants - List of AI assistants
         */
        function renderAIAssistants(assistants) {
            const aiSection = document.querySelector('.category-section .chat-items');
            if (!aiSection) return;
            aiSection.innerHTML = '';
            assistants.forEach(assistant => {
                const item = createChatItem({
                    type: 'ai',
                    id: assistant.id,
                    name: assistant.name,
                    subtitle: assistant.base_prompt ? assistant.base_prompt.slice(0, 40) + '...' : '',
                    avatar: 'bi-robot',
                    online: true
                });
                aiSection.appendChild(item);
            });
        }

        /**
         * Render admins as chat items in the Admin/Doctor section
         * @param {Array} admins - List of admin profiles
         */
        function renderAdmins(admins) {
            const adminSection = document.querySelectorAll('.category-section .chat-items')[1];
            if (!adminSection) {
                console.warn('[renderAdmins] Admin section not found in DOM');
                return;
            }
            adminSection.innerHTML = '';
            admins.forEach(admin => {
                // Pastikan admin memiliki uuid/id
                if (!admin.id) {
                    console.warn('[renderAdmins] Admin profile tanpa id/uuid:', admin);
                    return;
                }
                // Gunakan nama, subtitle, avatar sesuai struktur data
                const item = createChatItem({
                    type: 'admin',
                    id: admin.id,
                    name: admin.full_name || admin.username || 'Admin',
                    subtitle: admin.role || admin.email || '',
                    avatar: 'bi bi-person-hearts', // Atur sesuai kebutuhan
                    online: true, // Atur sesuai status
                    uuid: admin.id
                });
                adminSection.appendChild(item);
            });
        }

        /**
         * Handler to load and render AI assistants and admins on page load
         * Selalu fetch data terbaru, tampilkan error jika gagal
         * Error handling diperkuat, log detail, dan UI error jelas.
         */
        async function loadChatItems() {
            try {
                // Tampilkan loading state pada chat items section
                const aiSection = document.querySelector('#ai-section .chat-items');
                const adminSection = document.querySelector('#admin-section .chat-items');
                if (aiSection) aiSection.innerHTML = '<div class="chat-item">Memuat AI assistants...</div>';
                if (adminSection) adminSection.innerHTML = '<div class="chat-item">Memuat admin/doctor...</div>';
                // Fetch AI assistants
                let aiAssistants = [];
                try {
                    aiAssistants = await fetchAIAssistants();
                } catch (err) {
                    console.error('[ChatItems] Gagal fetch AI assistants:', err);
                }
                // Fetch Admins
                let admins = [];
                try {
                    admins = await fetchAdmins();
                } catch (err) {
                    console.error('[ChatItems] Gagal fetch admins:', err);
                }
                // Render chat items
                renderAIAssistants(aiAssistants);
                renderAdmins(admins);
            } catch (err) {
                console.error('[ChatItems] Error loading chat items:', err);
                const aiSection = document.querySelector('#ai-section .chat-items');
                const adminSection = document.querySelector('#admin-section .chat-items');
                if (aiSection) aiSection.innerHTML = `<div class='chat-item'>Gagal memuat AI assistants: ${err.message}</div>`;
                if (adminSection) adminSection.innerHTML = `<div class='chat-item'>Gagal memuat admin/doctor: ${err.message}</div>`;
            }
        }

        // ===== INIT CHAT ITEMS ON DOMContentLoaded =====
        document.addEventListener('DOMContentLoaded', function() {
            // Load dan render AI assistants dan admins
            loadChatItems();
        });

        // ===== ADMIN CHAT SESSION HELPERS & HANDLERS =====

        /**
         * Helper untuk mengambil session user dari localStorage Supabase
         * @returns {Object|null} Object session user, atau null jika tidak ada
         */
        function getUserSessionFromLocalStorage() {
            // Ganti key sesuai project Supabase Anda
            const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
            if (!key) return null;
            try {
                const session = JSON.parse(localStorage.getItem(key));
                return session && session.user ? session : null;
            } catch (e) {
                return null;
            }
        }
        
        // Make getUserSessionFromLocalStorage available globally for other modules
        window.getUserSessionFromLocalStorage = getUserSessionFromLocalStorage;

        /**
         * Helper untuk cek apakah user sudah login
         * @returns {boolean}
         */
        function isUserLoggedIn() {
            const session = getUserSessionFromLocalStorage();
            return !!(session && session.access_token && session.user && session.user.id);
        }

        /**
         * Handler untuk klik chat item admin
         * @param {string} adminId - ID admin yang akan diajak chat
         * @param {Event} event - Event click
         */
        function handleAdminChatClick(adminId, event) {
            event.preventDefault();
            const session = getUserSessionFromLocalStorage();
            if (session && session.user && session.user.id) {
                // Redirect ke chatroom.html dengan userId dan adminId
                const userId = encodeURIComponent(session.user.id);
                const adminIdEnc = encodeURIComponent(adminId);
                window.location.href = `/chatroom.html?user=${userId}&admin=${adminIdEnc}`;
            } else {
                showToast('Silakan login terlebih dahulu untuk chat dengan admin.', 'error');
            }
        }

        // ===== EVENT BINDING FOR ADMIN CHAT ITEMS =====
        document.addEventListener('DOMContentLoaded', function() {
            // Helper untuk mengambil session user dari localStorage Supabase
            function getUserSessionFromLocalStorage() {
                const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
                if (!key) return null;
                try {
                    const session = JSON.parse(localStorage.getItem(key));
                    return session && session.user ? session : null;
                } catch (e) {
                    return null;
                }
            }

            // Setelah DOM siap, cari section admin/doctor
            setTimeout(() => {
                const adminSections = document.querySelectorAll('.category-section');
                if (adminSections.length < 2) return;
                const adminChatItems = adminSections[1].querySelectorAll('.chat-item');
                adminChatItems.forEach(item => {
                    // Cek tipe chatId dari onclick attribute (misal: openChat('doctor-general'))
                    const onclickAttr = item.getAttribute('onclick');
                    let adminId = null;
                    if (onclickAttr && onclickAttr.includes('openChat')) {
                        // Ambil id dari openChat('doctor-general') atau openChat('admin-support')
                        const match = onclickAttr.match(/openChat\(['"](doctor-[\w-]+|admin-[\w-]+)['"]\)/);
                        if (match) adminId = match[1];
                    }
                    if (adminId) {
                        item.addEventListener('click', function(e) {
                            e.preventDefault();
                            const session = getUserSessionFromLocalStorage();
                            if (session && session.user && session.user.id) {
                                const userId = encodeURIComponent(session.user.id);
                                const adminIdEnc = encodeURIComponent(adminId);
                                window.location.href = `/chatroom.html?user=${userId}&admin=${adminIdEnc}`;
                            } else {
                                if (typeof showToast === 'function') {
                                    showToast('Silakan login terlebih dahulu untuk chat dengan admin.', 'error');
                                } else {
                                    alert('Silakan login terlebih dahulu untuk chat dengan admin.');
                                }
                            }
                        });
                    }
                });
            }, 600); // Delay agar render selesai jika dinamis
        });

        // ===== UNREAD ADMIN MESSAGES REALTIME & UI =====

        /**
         * Fetch unread admin message counts for the current user.
         * @returns {Promise<Object>} { adminId: count, ... }
         */
        async function fetchUnreadAdminMessages() {
            // Ambil access_token Supabase dari localStorage
            const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
            let token = null;
            if (key) {
                try {
                    const session = JSON.parse(localStorage.getItem(key));
                    token = session && session.access_token ? session.access_token : null;
                } catch (e) {
                    token = null;
                }
            }
            if (!token) {
                showToast('Gagal mengambil access token. Silakan login ulang.', 'error');
                throw new Error('No access token found in localStorage');
            }

            try {
                // Endpoint tidak perlu userId, karena backend ambil dari JWT
                const res = await fetch('/api/unread-admin-messages', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const rawText = await res.text(); // Baca body sekali saja
                if (!res.ok) {
                    showToast(`Gagal mengambil status pesan admin. [${res.status}]`, 'error');
                    console.error('[fetchUnreadAdminMessages] Response not OK:', res.status, rawText);
                    throw new Error('Failed to fetch unread admin messages');
                }
                let data;
                try {
                    data = JSON.parse(rawText);
                } catch (jsonErr) {
                    showToast('Gagal parsing response unread admin messages (bukan JSON)', 'error');
                    console.error('[fetchUnreadAdminMessages] JSON parse error:', jsonErr, 'Response text:', rawText);
                    // Fallback: return empty object to avoid crash
                    return {};
                }
                return data;
            } catch (err) {
                showToast('Gagal mengambil status pesan admin.', 'error');
                console.error('[fetchUnreadAdminMessages] Exception:', err);
                // Fallback: return empty object to avoid crash
                return {};
            }
        }

        /**
         * Update unread marker (dot) for each admin chat item.
         * @param {Object|null} unreadCounts - { adminId(UUID): count, ... } atau null jika gagal fetch
         */
        function updateUnreadMarkers(unreadCounts) {
            // Hapus semua marker lama terlebih dahulu
            document.querySelectorAll('.unread-marker').forEach(marker => marker.remove());
            // Cari semua chat-item admin yang punya data-admin-uuid
            const adminChatItems = document.querySelectorAll('.chat-item[data-admin-uuid]');
            if (adminChatItems.length === 0) {
                console.warn('[UnreadMarker] Tidak ada .chat-item[data-admin-uuid] ditemukan. Pastikan HTML/JS sudah menambahkan attribute ini!');
            }
            adminChatItems.forEach(item => {
                const adminUuid = item.getAttribute('data-admin-uuid');
                let unread = 0;
                let isError = false;
                if (unreadCounts && typeof unreadCounts === 'object') {
                    unread = unreadCounts[adminUuid] ? unreadCounts[adminUuid] : 0;
                } else {
                    // Jika gagal fetch, tampilkan badge error (!)
                    isError = true;
                }
                // Cari elemen .chat-time di dalam item
                const chatTime = item.querySelector('.chat-time');
                if (!chatTime) {
                    console.warn('[UnreadMarker] .chat-time not found in chat-item (adminUuid=' + adminUuid + ')', item);
                    return;
                }
                // Jika unread > 0, insert marker di atas text Online
                if (unread > 0 || isError) {
                    // Pastikan tidak ada marker ganda
                    if (!chatTime.querySelector('.unread-marker')) {
                        const marker = document.createElement('span');
                        marker.className = 'unread-marker';
                        marker.title = isError ? 'Gagal mengambil status pesan' : (unread + ' pesan belum dibaca');
                        marker.textContent = isError ? '!' : (unread > 99 ? '99+' : unread);
                        marker.style.background = isError ? '#ff9800' : '';
                        marker.style.color = isError ? '#fff' : '';
                        marker.style.fontWeight = isError ? 'bold' : '';
                        chatTime.insertBefore(marker, chatTime.firstChild);
                    }
                }
            });
            if (!unreadCounts || typeof unreadCounts !== 'object') {
                console.info('[UnreadMarker] unreadCounts kosong/gagal fetch. Tidak ada pesan admin yang belum dibaca, atau mapping UUID tidak cocok.');
            }
        }

        /**
         * Subscribe to Supabase realtime for unread admin messages.
         * Requires supabase-js v2+ loaded globally.
         */
        async function subscribeUnreadAdminMessages(userId) {
            console.log('[Ngobras] Initializing Supabase client for unread messages subscription...');
            console.log('[Ngobras] Checking if window.getSupabaseClient is available:', typeof window.getSupabaseClient);
            console.log('[Ngobras] window object keys:', Object.keys(window).filter(k => k.includes('supa')));
            
            // Use centralized Supabase client
            if (typeof window.getSupabaseClient !== 'function') {
                console.error('[Ngobras] getSupabaseClient function not available. Make sure supabaseClient.js is loaded before ngobras.js');
                
                // Log all script elements to debug loading order
                const scripts = document.querySelectorAll('script');
                console.debug('[Ngobras] Loaded scripts:', Array.from(scripts).map(s => s.src || 'inline script'));
                
                throw new Error('getSupabaseClient function not available');
            }
            
            console.log('[Ngobras] getSupabaseClient function is available, calling it...');
            
            // Get client from centralized module
            const supabase = await window.getSupabaseClient();
            
            console.log('[Ngobras] getSupabaseClient() returned:', supabase ? 'valid client' : 'null/undefined');
            
            if (!supabase) {
                console.error('[Ngobras] Failed to get Supabase client from centralized module');
                throw new Error('Failed to get Supabase client from centralized module');
            }
            
            // Check if supabase client has expected methods
            console.log('[Ngobras] Supabase client methods available:',
                Object.keys(supabase).filter(k => typeof supabase[k] === 'function'));
            // Subscribe to INSERT/UPDATE/DELETE on messages
            const channel = supabase.channel('ngobras-unread-admin')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${userId}`
                }, async (payload) => {
                    // Only react if admin is sender, is_read is false, chat_type is null
                    const msg = payload.new || payload.old;
                    if (
                        msg &&
                        msg.receiver_id === userId &&
                        msg.is_read === false &&
                        (!msg.chat_type || msg.chat_type === null)
                    ) {
                        // Re-fetch unread counts and update UI
                        const unreadCounts = await fetchUnreadAdminMessages(userId);
                        updateUnreadMarkers(unreadCounts);
                    }
                })
                .subscribe(async (status, err) => {
                    if (status === 'SUBSCRIBED') {
                        // Initial fetch
                        const unreadCounts = await fetchUnreadAdminMessages(userId);
                        updateUnreadMarkers(unreadCounts);
                    } else if (err) {
                        console.error('Supabase subscribe error:', err);
                    }
                });
            // Optionally: return channel for cleanup
            return channel;
        }

        // ===== INIT UNREAD MARKERS ON DOMContentLoaded =====
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('[Ngobras] DOM loaded, checking user session for unread messages...');
            const session = getUserSessionFromLocalStorage();
            
            if (session && session.user && session.user.id) {
                console.log('[Ngobras] User session found, user_id:', session.user.id);
                try {
                    console.log('[Ngobras] Attempting to subscribe to unread admin messages...');
                    await subscribeUnreadAdminMessages(session.user.id);
                    console.log('[Ngobras] Successfully subscribed to unread admin messages');
                } catch (err) {
                    console.error('[Ngobras] Failed to subscribe to unread admin messages:', err);
                    // Jika subscribe gagal, tetap update badge error di UI
                    updateUnreadMarkers(null);
                    showToast('Gagal subscribe realtime unread badge. Cek koneksi atau backend.', 'error');
                }
            } else {
                console.log('[Ngobras] No user session found, showing error badges');
                // Jika user belum login, tampilkan badge error di semua admin
                updateUnreadMarkers(null);
            }
        });

        /**
         * Validates Supabase authentication token and session
         * @returns {Promise<boolean>} - True if valid, false otherwise
         */
        async function checkAuth() {
            const DEBUG_MODE = localStorage.getItem('ngobras_debug') === 'true';
            let errorType = null;
            let errorMessage = '';
            let stackTrace = '';
            let session = null;
            let supabase = null;
            try {
                // Ensure centralized Supabase client is available
                if (typeof window.getSupabaseClient !== 'function') {
                    errorType = 'NO_SUPABASE_CLIENT';
                    errorMessage = 'window.getSupabaseClient is not available. Check script order.';
                    throw new Error(errorMessage);
                }
                supabase = await window.getSupabaseClient();
                if (!supabase || !supabase.auth) {
                    errorType = 'NO_SUPABASE_AUTH';
                    errorMessage = 'Supabase client or auth module not available.';
                    throw new Error(errorMessage);
                }
                // Try to get session from Supabase
                session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
                if (!session) {
                    // Fallback: try to get from localStorage
                    const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
                    if (key) {
                        try {
                            session = JSON.parse(localStorage.getItem(key));
                        } catch (e) {
                            errorType = 'MALFORMED_TOKEN';
                            errorMessage = 'Malformed token in localStorage.';
                            stackTrace = e.stack;
                            throw e;
                        }
                    }
                }
                if (!session || !session.access_token || !session.user) {
                    errorType = 'NO_SESSION';
                    errorMessage = 'No valid session or access token found.';
                    throw new Error(errorMessage);
                }
                // Validate expiry
                const now = Math.floor(Date.now() / 1000);
                const exp = session.expires_at || (session.user && session.user.exp);
                if (exp && now > exp) {
                    errorType = 'TOKEN_EXPIRED';
                    errorMessage = 'Session token expired.';
                    throw new Error(errorMessage);
                }
                if (DEBUG_MODE) {
                    console.log('[NGOBRAS_DEBUG] Auth valid:', session);
                }
                return true;
            } catch (error) {
                if (!errorType) errorType = 'UNKNOWN';
                if (!errorMessage) errorMessage = error.message;
                stackTrace = error.stack;
                // Log error in required format
                console.error('[NGOBRAS_AUTH]', {
                    error: errorType,
                    message: errorMessage,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    stackTrace
                });
                if (DEBUG_MODE) {
                    console.log('[NGOBRAS_DEBUG] Auth check failed:', errorType, errorMessage, stackTrace);
                }
                showAuthModal(errorType, errorMessage);
                return false;
            }
        }

        /**
         * Show the login modal and block interaction
         * @param {string} errorType
         * @param {string} errorMessage
         */
        function showAuthModal(errorType, errorMessage) {
            const modal = document.getElementById('ngobras-auth-modal');
            const errorDiv = document.getElementById('ngobras-auth-modal-error');
            if (!modal) return;
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = errorType ? `[${errorType}] ${errorMessage}` : errorMessage;
            }
            // Focus modal for accessibility
            setTimeout(() => {
                const content = modal.querySelector('.ngobras-auth-modal__content');
                if (content) content.focus();
            }, 100);
            // Prevent closing modal by keyboard or click
            modal.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') e.preventDefault();
            });
            // Login button handler
            const loginBtn = document.getElementById('ngobras-auth-login-btn');
            if (loginBtn) {
                loginBtn.onclick = function() {
                    window.location.href = 'login.html';
                };
            }
        }

        /**
         * Validates Supabase authentication token for admin.
         * Shows admin login modal if not authenticated.
         * Redirects to login_admin.html with email on login.
         * Strong error handling and diagnostics included.
         */
        async function checkAdminAuth() {
            const DEBUG_MODE = localStorage.getItem('ngobras_debug') === 'true';
            let errorType = null;
            let errorMessage = '';
            let stackTrace = '';
            let session = null;
            let supabase = null;
            try {
                if (typeof window.getSupabaseClient !== 'function') {
                    errorType = 'NO_SUPABASE_CLIENT';
                    errorMessage = 'window.getSupabaseClient is not available. Check script order.';
                    throw new Error(errorMessage);
                }
                supabase = await window.getSupabaseClient();
                if (!supabase || !supabase.auth) {
                    errorType = 'NO_SUPABASE_AUTH';
                    errorMessage = 'Supabase client or auth module not available.';
                    throw new Error(errorMessage);
                }
                // Try to get session from Supabase
                session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
                if (!session) {
                    // Fallback: try to get from localStorage
                    const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
                    if (key) {
                        try {
                            session = JSON.parse(localStorage.getItem(key));
                        } catch (e) {
                            errorType = 'MALFORMED_TOKEN';
                            errorMessage = 'Malformed token in localStorage.';
                            stackTrace = e.stack;
                            throw e;
                        }
                    }
                }
                if (!session || !session.access_token || !session.user) {
                    errorType = 'NO_SESSION';
                    errorMessage = 'No valid session or access token found.';
                    throw new Error(errorMessage);
                }
                // Validate expiry
                const now = Math.floor(Date.now() / 1000);
                const exp = session.expires_at || (session.user && session.user.exp);
                if (exp && now > exp) {
                    errorType = 'TOKEN_EXPIRED';
                    errorMessage = 'Session token expired.';
                    throw new Error(errorMessage);
                }
                if (DEBUG_MODE) {
                    console.log('[NGOBRAS_DEBUG] Admin auth valid:', session);
                }
                return true;
            } catch (error) {
                if (!errorType) errorType = 'UNKNOWN';
                if (!errorMessage) errorMessage = error.message;
                stackTrace = error.stack;
                // Log error in required format
                console.error('[NGOBRAS_ADMIN_AUTH]', {
                    error: errorType,
                    message: errorMessage,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    stackTrace
                });
                if (DEBUG_MODE) {
                    console.log('[NGOBRAS_DEBUG] Admin auth check failed:', errorType, errorMessage, stackTrace);
                }
                showAdminAuthModal(errorType, errorMessage);
                return false;
            }
        }

        /**
         * Show the admin login modal and block interaction
         * @param {string} errorType
         * @param {string} errorMessage
         */
        function showAdminAuthModal(errorType, errorMessage) {
            const modal = document.getElementById('ngobras-admin-auth-modal');
            const errorDiv = document.getElementById('ngobras-admin-auth-modal-error');
            if (!modal) return;
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.textContent = errorType ? `[${errorType}] ${errorMessage}` : errorMessage;
            }
            // Focus modal for accessibility
            setTimeout(() => {
                const content = modal.querySelector('.ngobras-auth-modal__content');
                if (content) content.focus();
            }, 100);
            // Prevent closing modal by keyboard or click
            modal.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') e.preventDefault();
            });
            // Login button handler
            const loginBtn = document.getElementById('ngobras-admin-auth-login-btn');
            if (loginBtn) {
                loginBtn.onclick = function() {
                    const emailInput = document.getElementById('ngobras-admin-auth-email');
                    const email = emailInput ? emailInput.value.trim() : '';
                    if (!email) {
                        if (errorDiv) {
                            errorDiv.style.display = 'block';
                            errorDiv.textContent = 'Email admin wajib diisi.';
                        }
                        if (emailInput) emailInput.focus();
                        return;
                    }
                    // Redirect to login_admin.html with email as query param
                    window.location.href = `login_admin.html?email=${encodeURIComponent(email)}`;
                };
            }
        }

        // Run both user and admin authentication checks on DOMContentLoaded
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                // First, check user auth (for regular user flows)
                const isAuth = await checkAuth();
                if (!isAuth) {
                    // User modal will be shown by checkAuth
                    return;
                }
                // Then, check admin auth (for admin flows)
                const isAdminAuth = await checkAdminAuth();
                if (!isAdminAuth) {
                    // Admin modal will be shown by checkAdminAuth
                    return;
                }
                // ...existing code...
            } catch (e) {
                // Fallback: show modal if anything fails
                showAuthModal('FATAL', e.message || 'Unknown error');
            }
        });

        /**
         * Render home page content (chat categories)
         * Akan dipanggil saat navigasi ke home
         */
        function renderHomeContent() {
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) {
                console.error('[NGOBRAS_HOME] Main content container not found');
                return;
            }
            try {
                // Render struktur dasar home, data dinamis akan di-load oleh loadChatItems()
                mainContent.innerHTML = `
                <div class="chat-categories">
                    <!-- ===== AI CONSULTATION SECTION ===== -->
                    <section id="ai-section" class="category-section fade-in">
                        <div class="category-header">
                            <div class="category-icon ai-icon"><i class="bi bi-robot"></i></div>
                            <div>
                                <div class="category-title">Konsultasi AI</div>
                                <div class="category-subtitle">Respons cepat 24/7</div>
                            </div>
                        </div>
                        <div class="chat-items"></div>
                    </section>
                    <!-- ===== ADMIN/DOCTOR CONSULTATION SECTION ===== -->
                    <section id="admin-section" class="category-section fade-in">
                        <div class="category-header">
                            <div class="category-icon admin-icon"><i class="bi bi-person-vcard"></i></div>
                            <div>
                                <div class="category-title">Konsultasi Dokter</div>
                                <div class="category-subtitle">Tenaga medis profesional</div>
                            </div>
                        </div>
                        <div class="chat-items"></div>
                    </section>
                </div>
                `;
            } catch (err) {
                mainContent.innerHTML = `<div class='error-container'><h3>Gagal menampilkan halaman utama</h3><div class='error-details'>${err.message}</div></div>`;
                console.error('[NGOBRAS_HOME] Error rendering home:', err);
            }
        }
