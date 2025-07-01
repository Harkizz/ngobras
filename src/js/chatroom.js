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
let supabase = null;
async function initSupabase() {
    try {
        console.log('[Chatroom] Initializing Supabase client...');
        ensureSupabaseClientAvailable();
        
        // Get client from centralized module
        console.log('[Chatroom] Calling window.getSupabaseClient()...');
        supabase = await window.getSupabaseClient();
        
        console.log('[Chatroom] getSupabaseClient() returned:', supabase ? 'valid client' : 'null/undefined');
        
        if (!supabase) {
            console.error('[Chatroom] Failed to get Supabase client from centralized module');
            throw new Error('Failed to get Supabase client from centralized module');
        }
        
        // Check if supabase client has expected methods
        console.log('[Chatroom] Supabase client methods available:',
            Object.keys(supabase).filter(k => typeof supabase[k] === 'function'));
        
        console.log('[Chatroom] Supabase client initialized successfully');
        return true;
    } catch (err) {
        showError('Gagal inisialisasi Supabase: ' + err.message);
        console.error('[Chatroom][Supabase Init Error]', err);
        return false;
    }
}

// Error container untuk menampilkan pesan error
function ensureErrorContainer() {
    let container = document.getElementById('chat-error-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'chat-error-container';
        container.style.position = 'fixed';
        container.style.top = '70px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.background = '#ffb3b3';
        container.style.color = '#2C3E50';
        container.style.padding = '12px 24px';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        container.style.zIndex = '2000';
        container.style.display = 'none';
        container.style.fontWeight = 'bold';
        container.style.maxWidth = '90vw';
        container.style.textAlign = 'center';
        document.body.appendChild(container);
    }
    return container;
}

// Tampilkan error di UI dengan auto-hide dan tombol close
function showError(msg) {
    const container = ensureErrorContainer();
    container.innerHTML = `${msg} <button id='close-error-btn' style='margin-left:16px;background:none;border:none;font-size:1.2em;cursor:pointer;'>&times;</button>`;
    container.style.display = 'block';
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
    chatBody.innerHTML = '';
    messages.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (msg.sender_id === userId ? 'sent' : 'received');
        const text = document.createElement('span');
        text.className = 'bubble-text';
        text.textContent = msg.content;
        const time = document.createElement('span');
        time.className = 'bubble-time';
        time.textContent = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        // Tambahkan ikon centang untuk pesan yang dikirim (sent)
        if (msg.sender_id === userId) {
            const checkIcon = document.createElement('i');
            checkIcon.className = 'bi bi-check2 bubble-check';
            checkIcon.title = 'Terkirim';
            time.appendChild(document.createTextNode(' '));
            time.appendChild(checkIcon);
        }
        bubble.appendChild(text);
        bubble.appendChild(time);
        chatBody.appendChild(bubble);
    });
    // Scroll ke bawah otomatis
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Global untuk userId dan adminId
let userId = null;
let adminId = null;
let messages = [];
let subscription = null;
let pollingInterval = null; // Untuk fallback polling

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
        indicator.style.position = 'fixed';
        indicator.style.top = '0';
        indicator.style.left = '0';
        indicator.style.right = '0';
        indicator.style.background = '#ff9800';
        indicator.style.color = 'white';
        indicator.style.padding = '5px';
        indicator.style.textAlign = 'center';
        indicator.style.zIndex = '9999';
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

// Fallback polling jika realtime gagal
function startPollingMessages() {
    if (pollingInterval) return;
    pollingInterval = setInterval(fetchInitialMessages, 3000); // Poll setiap 3 detik
    showError('Realtime tidak tersedia, menggunakan polling otomatis.');
    console.log('Polling started.');
}
function stopPollingMessages() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('Polling stopped.');
    }
}

// Subscribe realtime ke tabel messages
async function subscribeToMessages() {
    if (!supabase) {
        console.warn('[Chatroom] Supabase client not initialized, initializing now...');
        const initialized = await initSupabase();
        if (!initialized) {
            console.error('[Chatroom] Failed to initialize Supabase, cannot subscribe to messages');
            return;
        }
    }
    
    console.log('[Chatroom] Supabase client before subscription:',
        supabase ? 'exists' : 'null/undefined',
        supabase ? `with methods: ${Object.keys(supabase).filter(m => typeof supabase[m] === 'function').join(', ')}` : '');
    console.log('Attempting to subscribe to messages channel for user:', userId, 'and admin:', adminId);
    try {
        // Subscribe ke semua perubahan pada tabel messages
        subscription = supabase.channel('messages-channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages'
            }, payload => {
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
            })
            .subscribe(
                async (status, err) => {
                    console.log('Supabase subscribe status:', status, 'error:', err);
                    if (status === 'SUBSCRIBED') {
                        stopPollingMessages();
                        console.log('Berhasil subscribe ke pesan realtime');
                        // Setelah subscribe realtime sukses, mark semua pesan admin ke user sebagai read
                        try {
                            const token = getSupabaseAccessToken();
                            if (token) {
                                const res = await fetch('/api/messages/mark-read', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ sender_id: adminId, receiver_id: userId })
                                });
                                if (!res.ok) {
                                    let errData = {};
                                    try { errData = await res.json(); } catch (e) {}
                                    showError('Gagal menandai pesan admin sebagai sudah dibaca: ' + (errData.error || res.statusText));
                                    console.error('[mark-read] error:', errData);
                                } else {
                                    const result = await res.json();
                                    console.log('[mark-read] Success:', result);
                                    if (result && typeof result.updated === 'number' && result.updated === 0) {
                                        // Bukan error jika tidak ada pesan yang perlu di-mark as read
                                        console.info('[mark-read] Tidak ada pesan admin yang perlu diupdate (semua sudah dibaca atau tidak ada pesan).');
                                    }
                                }
                            } else {
                                showError('Token login tidak ditemukan, tidak bisa mark pesan admin sebagai read.');
                            }
                        } catch (err) {
                            showError('Gagal mark pesan admin sebagai read: ' + err.message);
                            console.error('[mark-read] exception:', err);
                        }
                        await fetchInitialMessages();
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
                        showError('Gagal subscribe ke pesan realtime. Beralih ke polling.');
                        startPollingMessages();
                        if (err) console.error('Supabase subscribe error details:', err);
                    }
                }
            );
    } catch (err) {
        showError('Gagal subscribe realtime: ' + err.message);
        startPollingMessages();
        console.error('Error during subscribe setup:', err);
    }
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
    if (subscription && supabase) {
        supabase.removeChannel(subscription);
        subscription = null;
        console.log('Supabase channel unsubscribed.');
    }
    stopPollingMessages();
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
    await initSupabase();
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
    if (!chatForm || !chatInput) return;

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
                showError('Gagal mengirim pesan: ' + (errData.error || res.statusText));
                console.error('POST /api/messages error:', errData);
                return;
            }
            // Pesan berhasil dikirim, kosongkan input
            chatInput.value = '';
            // Tidak perlu fetch ulang, pesan akan masuk lewat realtime
        } catch (err) {
            showError('Gagal mengirim pesan: ' + err.message);
            console.error('POST /api/messages exception:', err);
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