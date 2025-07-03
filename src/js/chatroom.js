// ===== SUPABASE REALTIME CHAT =====

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('SW registered for chatroom: ', registration);
            })
            .catch(function(registrationError) {
                console.error('SW registration failed: ', registrationError);
            });
    });
}

// Check if running in standalone mode (PWA)
function isPWAMode() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone;
}

// Apply PWA-specific styles if in standalone mode
document.addEventListener('DOMContentLoaded', function() {
    if (isPWAMode()) {
        document.body.classList.add('pwa-mode');
        console.log('Running in PWA mode');
    }
});

// Helper: pastikan centralized Supabase client sudah tersedia
function ensureSupabaseClientAvailable() {
    console.log('[Chatroom] Checking if window.getSupabaseClient is available:', typeof window.getSupabaseClient);
    console.log('[Chatroom] window object keys:', Object.keys(window).filter(k => k.includes('supa')));
    
    if (typeof window.getSupabaseClient !== 'function') {
        const msg = '[ERROR] getSupabaseClient function not available. Make sure supabaseClient.js is loaded before chatroom.js';
        console.error(msg);
        
        // Log all script elements to debug loading order
        const scripts = document.querySelectorAll('script');
        console.debug('[Chatroom] Loaded scripts:', Array.from(scripts).map(s => s.src || 'inline script'));
        
        showError(msg + '\nCek urutan <script> di HTML.');
        throw new Error(msg);
    }
    
    console.log('[Chatroom] getSupabaseClient function is available');
}

// Helper: Ambil query parameter dari URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Inisialisasi Supabase client menggunakan centralized client
// Use centralized Subscription Manager for all realtime/polling logic
let subscriptionManager = null;
async function initSupabase() {
    // No-op: handled by SubscriptionManager
    return true;
}

// Error container untuk menampilkan pesan error
function ensureErrorContainer() {
    let container = document.getElementById('chat-error-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'chat-error-container';
        container.setAttribute('role', 'alert');
        container.setAttribute('aria-live', 'assertive');
        document.body.appendChild(container);
    }
    return container;
}

// Tampilkan error di UI dengan auto-hide dan tombol close
function showError(msg) {
    const container = ensureErrorContainer();
    container.innerHTML = `
        <div class="error-content">
            <span>${msg}</span>
            <button id='close-error-btn' aria-label="Tutup pesan error">&times;</button>
        </div>
    `;
    container.style.display = 'flex';
    
    // Close handler
    document.getElementById('close-error-btn').onclick = () => {
        container.style.display = 'none';
    };
    
    // Auto-hide setelah 7 detik
    clearTimeout(container._timeout);
    container._timeout = setTimeout(() => {
        container.style.display = 'none';
    }, 7000);
    
    console.error(msg);
}

// Render pesan ke chat body
function renderMessages(messages) {
    const chatBody = document.querySelector('.chat-body');
    if (!chatBody) return;
    
    // Hide loading state if it exists
    const loadingElement = document.querySelector('.chat-loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Clear existing messages except loading element
    Array.from(chatBody.children).forEach(child => {
        if (!child.classList.contains('chat-loading')) {
            child.remove();
        }
    });
    
    if (messages.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'chat-empty-state';
        emptyState.innerHTML = `
            <div class="empty-icon">
                <i class="bi bi-chat-dots" aria-hidden="true"></i>
            </div>
            <p>Belum ada pesan. Mulai percakapan sekarang!</p>
        `;
        chatBody.appendChild(emptyState);
        return;
    }
    
    messages.forEach(msg => {
        const isSent = msg.sender_id === userId;
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (isSent ? 'sent' : 'received');
        bubble.setAttribute('aria-label', isSent ? 'Pesan terkirim' : 'Pesan diterima');
        
        const text = document.createElement('span');
        text.className = 'bubble-text';
        text.textContent = msg.content;
        
        const time = document.createElement('span');
        time.className = 'bubble-time';
        const formattedTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        time.textContent = formattedTime;
        time.setAttribute('aria-label', `Dikirim pukul ${formattedTime}`);
        
        // Tambahkan ikon centang untuk pesan yang dikirim (sent)
        if (isSent) {
            const checkIcon = document.createElement('i');
            checkIcon.className = 'bi bi-check2 bubble-check';
            checkIcon.setAttribute('aria-hidden', 'true');
            checkIcon.title = 'Terkirim';
            time.appendChild(document.createTextNode(' '));
            time.appendChild(checkIcon);
        }
        
        bubble.appendChild(text);
        bubble.appendChild(time);
        
        // Add animation class
        bubble.classList.add('animate-in');
        
        chatBody.appendChild(bubble);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            bubble.classList.remove('animate-in');
        }, 500);
    });
    
    // Scroll ke bawah otomatis dengan smooth scrolling
    chatBody.scrollTo({
        top: chatBody.scrollHeight,
        behavior: 'smooth'
    });
}

// Global untuk userId dan adminId
let userId = null;
let adminId = null;
let messages = [];
// Remove legacy subscription/polling variables

// Helper: Ambil access_token Supabase dari localStorage
function getSupabaseAccessToken() {
    // Cari key yang mengandung '-auth-token' (default Supabase)
    const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
    if (!key) return null;
    try {
        const session = JSON.parse(localStorage.getItem(key));
        return session && session.access_token ? session.access_token : null;
    } catch (e) {
        return null;
    }
}

// Handle offline status
function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    if (!isOnline) {
        showOfflineIndicator();
    } else {
        hideOfflineIndicator();
    }
}

function showOfflineIndicator() {
    let indicator = document.getElementById('offline-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.innerHTML = 'Anda sedang offline';
        indicator.setAttribute('role', 'alert');
        indicator.setAttribute('aria-live', 'assertive');
        document.body.appendChild(indicator);
    }
    indicator.style.display = 'block';
}

function hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Listen for online/offline events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Fetch pesan awal dari backend
async function fetchInitialMessages() {
    console.log('Fetching initial messages for user:', userId, 'and admin:', adminId);
    try {
        const token = getSupabaseAccessToken();
        if (!token) {
            showError('Anda belum login. Silakan login untuk melihat pesan.');
            return;
        }
        // Kirim Authorization header ke backend agar backend bisa query dengan JWT user
        const res = await fetch(`/api/messages/${userId}/${adminId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) {
            let errData = {};
            try { errData = await res.json(); } catch (e) {}
            showError('Gagal mengambil pesan awal: ' + (errData.error || res.statusText));
            console.error('Error response:', errData);
            return;
        }
        let result = await res.json();
        // Handle jika response berupa { messages: [...] } atau array langsung
        let arr = Array.isArray(result) ? result : (Array.isArray(result.messages) ? result.messages : []);
        console.log('Initial messages fetched:', arr);
        // Urutkan pesan berdasarkan waktu (created_at)
        arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        messages = arr;
        renderMessages(messages);
    } catch (err) {
        showError('Gagal memuat pesan: ' + err.message);
        console.error('Error fetching initial messages:', err);
    }
}

// Polling handled by SubscriptionManager

// Use SubscriptionManager for all subscriptions
async function subscribeToMessages() {
    if (!subscriptionManager) return;
    // Only subscribe if realtime is enabled
    return subscriptionManager.subscribe(
        'messages',
        { event: '*', schema: 'public', table: 'messages' },
        payload => {
            // Filter event di sisi client: hanya proses jika sender/receiver cocok
            const relevant = (
                (payload.new && (
                    (payload.new.sender_id === userId && payload.new.receiver_id === adminId) ||
                    (payload.new.sender_id === adminId && payload.new.receiver_id === userId)
                )) ||
                (payload.old && (
                    (payload.old.sender_id === userId && payload.old.receiver_id === adminId) ||
                    (payload.old.sender_id === adminId && payload.old.receiver_id === userId)
                ))
            );
            if (relevant) {
                console.log('Realtime event relevant, updating UI:', payload);
                handleRealtimeMessage(payload);
            } else {
                console.log('Realtime event ignored (not relevant to this chat):', payload);
            }
        }
    );
}

// Handler untuk pesan realtime
function handleRealtimeMessage(payload) {
    console.log('Realtime message received:', payload);
    try {
        // Cek tipe event dan update array messages
        if (payload.eventType === 'INSERT') {
            // Tambahkan pesan baru jika belum ada (hindari duplikat)
            if (!messages.some(m => m.id === payload.new.id)) {
                messages.push(payload.new);
                console.log('Message inserted:', payload.new);
            }
        } else if (payload.eventType === 'UPDATE') {
            // Update pesan jika ada perubahan
            const idx = messages.findIndex(m => m.id === payload.new.id);
            if (idx !== -1) {
                messages[idx] = payload.new;
                console.log('Message updated:', payload.new);
            }
        } else if (payload.eventType === 'DELETE') {
            // Hapus pesan jika dihapus
            messages = messages.filter(m => m.id !== payload.old.id);
            console.log('Message deleted:', payload.old);
        }
        // Urutkan pesan berdasarkan waktu (created_at)
        messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        renderMessages(messages);
        // Debug log
        console.log('Current messages array:', messages);
    } catch (err) {
        showError('Gagal update pesan realtime: ' + err.message);
        console.error('Error handling realtime message:', err);
    }
}

// Unsubscribe saat keluar dari halaman
function cleanupSubscription() {
    if (subscriptionManager) subscriptionManager.cleanup();
}

// Inisialisasi chatroom
async function initChatroom() {
    userId = getQueryParam('user_id');
    adminId = getQueryParam('admin_id');
    console.log('Initializing chatroom with user_id:', userId, 'admin_id:', adminId);
    if (!userId || !adminId) {
        showError('User ID atau Admin ID tidak ditemukan di URL');
        console.error('User ID or Admin ID missing in URL');
        return;
    }
    // Initialize Subscription Manager
    subscriptionManager = new window.SupabaseSubscriptionManager({
        getSupabaseClient: window.getSupabaseClient,
        fetchMessages: fetchInitialMessages
    });
    await subscriptionManager.initialize();
    await fetchInitialMessages();
    await subscribeToMessages();
}

document.addEventListener('DOMContentLoaded', function() {
    initChatroom();
    updateOnlineStatus(); // Check initial online status
});
window.addEventListener('beforeunload', cleanupSubscription);

// Helper: Ambil query parameter dari URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Fetch profile admin dari backend
async function fetchAdminProfile(adminId) {
    try {
        const res = await fetch(`/api/profiles/${adminId}`);
        if (!res.ok) throw new Error('Gagal fetch profile admin');
        return await res.json();
    } catch (err) {
        return null;
    }
}

// Update nama admin di top bar
async function updateAdminName() {
    const adminId = getQueryParam('admin_id');
    if (!adminId) return;
    const profile = await fetchAdminProfile(adminId);
    if (profile && profile.full_name) {
        document.querySelector('.profile-name').textContent = profile.full_name;
    } else {
        document.querySelector('.profile-name').textContent = 'Admin';
    }
}

document.addEventListener('DOMContentLoaded', updateAdminName);
// ===== HANDLE CHAT INPUT & SEND MESSAGE =====

document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.querySelector('.chat-input-bar');
    const chatInput = document.querySelector('.input-message');
    const sendButton = document.querySelector('.input-send');
    
    if (!chatForm || !chatInput || !sendButton) return;

    // Function to show sending state
    function showSendingState(isLoading) {
        if (isLoading) {
            sendButton.disabled = true;
            chatInput.disabled = true;
            sendButton.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
        } else {
            sendButton.disabled = false;
            chatInput.disabled = false;
            sendButton.innerHTML = '<i class="bi bi-send" aria-hidden="true"></i>';
        }
    }

    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const content = chatInput.value.trim();
        if (!content) return;
        
        if (!userId || !adminId) {
            showError('User ID atau Admin ID tidak ditemukan. Tidak bisa mengirim pesan.');
            return;
        }
        
        const token = getSupabaseAccessToken();
        if (!token) {
            showError('Anda belum login. Silakan login untuk mengirim pesan.');
            return;
        }
        
        // Show loading state
        showSendingState(true);
        
        // Optimistically add message to UI
        const optimisticMsg = {
            id: 'temp-' + Date.now(),
            sender_id: userId,
            receiver_id: adminId,
            content: content,
            created_at: new Date().toISOString(),
            is_read: false
        };
        
        messages.push(optimisticMsg);
        renderMessages(messages);
        
        // Clear input immediately for better UX
        chatInput.value = '';
        
        // Siapkan payload sesuai struktur tabel messages
        const payload = {
            sender_id: userId,
            receiver_id: adminId,
            content: content,
            chat_type: 'admin' // atau 'ai' jika chat dengan AI
        };
        
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
                let errData = {};
                try { errData = await res.json(); } catch (e) {}
                
                // Remove optimistic message on error
                messages = messages.filter(m => m.id !== optimisticMsg.id);
                renderMessages(messages);
                
                showError('Gagal mengirim pesan: ' + (errData.error || res.statusText));
                console.error('POST /api/messages error:', errData);
            }
            
            // The actual message will come through the realtime subscription
        } catch (err) {
            // Remove optimistic message on error
            messages = messages.filter(m => m.id !== optimisticMsg.id);
            renderMessages(messages);
            
            showError('Gagal mengirim pesan: ' + err.message);
            console.error('POST /api/messages exception:', err);
        } finally {
            // Reset sending state
            showSendingState(false);
        }
    });
    
    // Add input focus and keyboard accessibility
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
});

// ===== HANDLE BACK BUTTON =====
document.addEventListener('DOMContentLoaded', function() {
    const backBtn = document.querySelector('.nav-back');
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            try {
                // Navigasi ke ngobras.html (halaman utama chat)
                window.location.href = 'ngobras.html';
            } catch (err) {
                showError('Gagal kembali ke halaman utama: ' + err.message);
                console.error('[BackButton] Navigation error:', err);
            }
        });
    } else {
        console.warn('[BackButton] .nav-back button not found in DOM');
    }
});