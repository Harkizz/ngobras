// JavaScript for ngobras.html page
let currentChatType = 'admin';
let currentChatName = '';
let chatHistory = {}; // Store chat messages for each assistant/admin

// --- Memory helpers ---
function getChatHistory(chatId) {
    // Hanya untuk AI, bukan admin
    if (chatId.startsWith('ai_')) {
        const key = `ngobras_chat_history_${chatId}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }
    return [];
}

function saveChatMessage(chatId, text, isSent) {
    // Hanya untuk AI, bukan admin
    if (chatId.startsWith('ai_')) {
        const key = `ngobras_chat_history_${chatId}`;
        let history = getChatHistory(chatId);
        history.push({
            text: text,
            isSent: isSent,
            timestamp: new Date().toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        });
        localStorage.setItem(key, JSON.stringify(history));
    }
}

// --- Load messages for AI chat ---
function loadAIMessages(assistantName = currentChatName) {
    const messagesList = document.getElementById('messages-list');
    const chatId = `ai_${assistantName}`;
    const history = getChatHistory(chatId);

    if (messagesList) {
        messagesList.innerHTML = '';
        if (history.length > 0) {
            history.forEach(msg => {
                addMessage(msg.text, msg.isSent);
            });
        }
    }
    scrollToBottom();
}

// Go back to home
function goBack() {
    const bottomNav = document.querySelector('.bottom-nav');
    const topNavbar = document.querySelector('.top-navbar');
    if (bottomNav) bottomNav.style.display = 'flex';
    if (topNavbar) topNavbar.style.display = 'flex';

    // Remove admin ID from localStorage and log
    const userProfileStr = localStorage.getItem('ngobras_user_profile');
    const userId = userProfileStr ? JSON.parse(userProfileStr).id : null;
    const adminId = localStorage.getItem('ngobras_current_admin_id');
    if (userId && adminId) {
        const chatKey = `ngobras_admin_chat_${userId}_${adminId}`;
        localStorage.removeItem(chatKey);
        console.log('Deleted chat history from localStorage:', chatKey);
    }
    if (localStorage.getItem('ngobras_current_admin_id')) {
        localStorage.removeItem('ngobras_current_admin_id');
        console.log("Admin ID returned");
    }

    showPage('home');
}

function renderAdminMessages(messages, userId) {
    const messagesList = document.getElementById('messages-list');
    if (!messagesList) return;
    messagesList.innerHTML = '';
    messages.forEach(msg => {
        const isSent = msg.sender_id === userId;
        addMessage(msg.content, isSent);
    });
    scrollToBottom();
}

// Switch chat type
function switchToAI() {
    currentChatType = 'ai';
    loadAIMessages(currentChatName);
    
    // Update header
    const avatar = document.getElementById('current-chat-avatar');
    const status = document.getElementById('current-chat-status');
    
    avatar.className = 'chat-avatar ai';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    document.getElementById('current-chat-name').textContent = 'NGOBRAS AI Assistant';
    status.textContent = 'AI Assistant - Online';
    
    // Update switch buttons
    document.querySelector('.switch-btn.ai').classList.add('active');
    document.querySelector('.switch-btn.admin').classList.remove('active');
}

function switchToAdmin() {
    currentChatType = 'admin';
    // Ambil userId dan adminId
    const userProfileStr = localStorage.getItem('ngobras_user_profile');
    const userId = userProfileStr ? JSON.parse(userProfileStr).id : null;
    const adminId = localStorage.getItem('ngobras_current_admin_id');
    if (userId && adminId) {
        loadAdminMessagesFromDB(userId, adminId);
    }
    // Update header
    const avatar = document.getElementById('current-chat-avatar');
    const status = document.getElementById('current-chat-status');
    avatar.className = 'chat-avatar admin';
    avatar.innerHTML = '<i class="fas fa-user-md"></i>';
    document.getElementById('current-chat-name').textContent = currentChatName || 'Dr. Sarah Wijaya';
    status.textContent = 'Online';
    document.querySelector('.switch-btn.admin').classList.add('active');
    document.querySelector('.switch-btn.ai').classList.remove('active');
}

// Helper: Format AI response with markdown-like rules
function formatAIResponse(text) {
    if (!text) return '';

    // Handle line breaks first
    let html = text.replace(/\r\n|\r|\n/g, '<br>');

    // Special container for <<...>> blocks with copy button
    html = html.replace(/<<([\s\S]*?)>>/g, function(match, content) {
        // Unique id for each card
        const cardId = 'ai-card-' + Math.random().toString(36).substr(2, 9);
        return `
            <div class="ai-special-card" id="${cardId}">
                <button class="copy-btn" title="Salin" onclick="copySolutionCard('${cardId}')">
                    <i class="fas fa-copy"></i>
                </button>
                ${content.trim()}
            </div>
        `;
    });

    // Headers: ##... or ###... etc.
    html = html.replace(/^(#{1,6})\s*(.+)$/gm, (match, hashes, content) => {
        const level = Math.min(hashes.length, 6);
        return `<h${level} class="ai-response-h${level}">${content.trim()}</h${level}>`;
    });

    // Bold: **...**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *...*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return html;
}

window.copySolutionCard = function(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    // Exclude the copy button itself from the copied text
    const temp = card.cloneNode(true);
    const btn = temp.querySelector('.copy-btn');
    if (btn) btn.remove();
    const text = temp.innerText.trim();

    const realBtn = card.querySelector('.copy-btn');
    if (!realBtn) return;

    navigator.clipboard.writeText(text).then(() => {
        // Change icon to tick and animate
        realBtn.classList.add('copied');
        realBtn.innerHTML = '<i class="fas fa-check"></i>';
        // Remove the animation and restore icon after 3 seconds
        setTimeout(() => {
            realBtn.classList.remove('copied');
            realBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    });
};

// AI responses
function addAIResponse(userMessage) {
    const responses = [
        "Terima kasih sudah berbagi. Saya memahami bahwa ini mungkin sulit untuk Anda. Mari kita cari solusi bersama.",
        "Itu adalah langkah yang baik untuk memulai. Apakah ada hal lain yang ingin Anda diskusikan?",
        "Saya merekomendasikan untuk mencoba teknik yang saya sebutkan secara bertahap. Bagaimana perasaan Anda setelah mendengar saran ini?",
        "Ingatlah bahwa setiap perubahan membutuhkan waktu. Jangan terlalu keras pada diri sendiri.",
        "Apakah Anda ingin saya memberikan panduan lebih detail tentang topik ini?"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    addMessage(randomResponse, false);
}

// Admin responses
function addAdminResponse(userMessage) {
    const responses = [
        "Saya sangat menghargai kepercayaan Anda untuk berbagi hal ini dengan saya. Mari kita jelajahi lebih dalam.",
        "Berdasarkan yang Anda ceritakan, saya rasa kita bisa mulai dengan strategi yang sederhana namun efektif.",
        "Penting untuk diingat bahwa Anda tidak sendirian dalam menghadapi ini. Saya di sini untuk mendampingi Anda.",
        "Bagaimana jika kita jadwalkan sesi konsultasi yang lebih mendalam minggu depan?",
        "Saya akan memberikan beberapa latihan yang bisa Anda coba di rumah. Apakah Anda siap untuk mencatatnya?"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    addMessage(randomResponse, false);
}

// Load messages for admin chat from Supabase
async function loadAdminMessagesFromDB(userId, adminId) {
    if (!window.supabaseClient) {
        const resp = await fetch('/api/supabase-config');
        const config = await resp.json();
        if (window.supabase && config.url && config.anonKey) {
            window.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
        } else {
            throw new Error('Supabase client not initialized');
        }
    }
    const { data: messages, error } = await window.supabaseClient
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
    if (error) throw error;
    renderAdminMessages(messages, userId);
}   

        // Emoji Picker Data (a subset of standard emojis, you can expand this)
const EMOJI_LIST = [
    "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","😡","😠","🤬","😷","🤒","🤕","🤢","🤮","🥴","😇","🥳","🥺","🤠","🤡","🤥","🤫","🤭","🧐","🤓","😈","👿","👹","👺","💀","👻","👽","🤖","💩","😺","😸","😹","😻","😼","😽","🙀","😿","😾"
];

// Notifications
function showNotifications() {
    alert('Notifikasi:\n• Dr. Sarah Wijaya mengirim pesan baru\n• Jadwal konsultasi minggu depan\n• Tips kesehatan mental harian');
}

// Load AI Assistants
async function loadAIAssistants() {
    const aiListContainer = document.getElementById('ai-assistants-list');
    const skeleton = document.getElementById('ai-assistants-list-skeleton');
    if (skeleton) skeleton.style.display = 'block';
    if (aiListContainer) aiListContainer.style.display = 'none';

    const start = Date.now();
    let data = [];
    let error = null;

    try {
        const response = await fetch('/api/ai-assistants');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        data = await response.json();
    } catch (err) {
        error = err;
    }

    // Wait until at least 3 seconds have passed
    const elapsed = Date.now() - start;
    if (elapsed < 3000) {
        await new Promise(res => setTimeout(res, 3000 - elapsed));
    }

    if (skeleton) skeleton.style.display = 'none';
    if (aiListContainer) aiListContainer.style.display = 'block';

    if (error) {
        aiListContainer.innerHTML = `
            <div class="chat-item error">
                <div class="chat-info">
                    <div class="chat-name">Error Loading AI Assistants</div>
                    <div class="chat-preview">${error.message}</div>
                </div>
            </div>
        `;
        return;
    }

    aiListContainer.innerHTML = '';
    if (!data || data.length === 0) {
        aiListContainer.innerHTML = `
            <div class="chat-item">
                <div class="chat-info">
                    <div class="chat-name">No AI Assistants Available</div>
                    <div class="chat-preview">Please try again later</div>
                </div>
            </div>
        `;
        return;
    }

    // Render assistants
    data.forEach(assistant => {
        const aiCard = document.createElement('div');
        aiCard.className = 'chat-item ai-assistant-card';
        aiCard.onclick = () => openChat('ai', assistant.name);

        let roleDescription = '';
        switch(assistant.name) {
            case 'NGOBRAS General Assistant':
                roleDescription = 'Asisten konseling umum & profesional';
                break;
            case 'Mental Health Specialist':
                roleDescription = 'Spesialis CBT & mindfulness';
                break;
            case 'Crisis Counselor':
                roleDescription = 'Konselor krisis terlatih';
                break;
            default:
                roleDescription = 'AI Assistant';
        }

        aiCard.innerHTML = `
            <div class="chat-avatar ai">
                <i class="fas fa-robot"></i>
                <div class="online-indicator"></div>
            </div>
            <div class="chat-info">
                <div class="chat-name">
                    ${assistant.name}
                    <span class="ai-badge">AI</span>
                </div>
                <div class="chat-preview">${roleDescription}</div>
            </div>
            <div class="chat-meta">
                <span class="ai-provider">${assistant.api_provider.toUpperCase()}</span>
            </div>
        `;
        
        aiListContainer.appendChild(aiCard);
    });
}

// Load Admins
async function loadAdminList() {
    const adminListContainer = document.getElementById('admin-list');
    const skeleton = document.getElementById('admin-list-skeleton');
    if (skeleton) skeleton.style.display = 'block';
    if (adminListContainer) adminListContainer.style.display = 'none';

    const start = Date.now();
    let data = [];
    let error = null;

    try {
        const response = await fetch('/api/admins');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        data = await response.json();
    } catch (err) {
        error = err;
    }

    // Wait until at least 3 seconds have passed
    const elapsed = Date.now() - start;
    if (elapsed < 3000) {
        await new Promise(res => setTimeout(res, 3000 - elapsed));
    }

    if (skeleton) skeleton.style.display = 'none';
    if (adminListContainer) adminListContainer.style.display = 'block';

    adminListContainer.innerHTML = '';
    if (error) {
        adminListContainer.innerHTML = `
            <div class="chat-item error">
                <div class="chat-info">
                    <div class="chat-name">Error Loading Admins</div>
                    <div class="chat-preview">${error.message}</div>
                </div>
            </div>
        `;
        return;
    }

    // Ensure we have an array
    const admins = Array.isArray(data) ? data : [];
    if (admins.length === 0) {
        adminListContainer.innerHTML = `
            <div class="chat-item">
                <div class="chat-info">
                    <div class="chat-name">No Admin Available</div>
                    <div class="chat-preview">Please try again later</div>
                </div>
            </div>
        `;
        return;
    }

    // Render admins
    admins.forEach(admin => {
        const adminCard = document.createElement('div');
        adminCard.className = 'chat-item';
        adminCard.setAttribute('data-admin-id', admin.id);
        adminCard.onclick = () => openChat('admin', admin.full_name || admin.username);
        
        adminCard.innerHTML = `
            <div class="chat-avatar admin">
                ${admin.avatar_url ? 
                    `<img src="${admin.avatar_url}" alt="${admin.username}">` :
                    '<i class="fas fa-user-md"></i>'}
                <div class="online-indicator"></div>
            </div>
            <div class="chat-info">
                <div class="chat-name">
                    ${admin.full_name || admin.username}
                    <span class="admin-badge">ADMIN</span>
                </div>
                <div class="chat-preview">Online - Siap membantu</div>
            </div>
            <div class="chat-meta">
                <span class="chat-status">Available</span>
                <span class="unread-count" style="display:none;" data-admin-id="${admin.id}">0</span>
            </div>
        `;
        
        adminListContainer.appendChild(adminCard);
    });
}

// Supabase
if (!window.supabaseClient) {
    window.supabaseClient = null;
}

// Show/hide loading state
function showProfileLoading(show) {
    document.getElementById('profileLoading').style.display = show ? 'block' : 'none';
    document.getElementById('profileContent').style.display = show ? 'none' : 'block';
}

// Add this function to handle profile updates
async function updateProfile(data) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .update(data)
            .eq('id', supabaseClient.auth.user().id);
            
        if (error) throw error;
        
        showAlert('Profile updated successfully', 'success');
        loadUserProfile(supabaseClient.auth.user().id);
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Failed to update profile', 'danger');
    }
}

// Add logout functionality
async function logout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        // Redirect to login page
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showAlert('Failed to sign out', 'danger');
    }
}

// Add to your existing event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the chat page
    const isChatPage = document.querySelector('.chat-room') !== null;
    
    if (isChatPage) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Auto-scroll to bottom when page loads
        setTimeout(scrollToBottom, 100);
    }

    // Load AI assistants and admins on home page
    const isHomePage = document.getElementById('home-page')?.classList.contains('active');
    if (isHomePage) {
        loadAIAssistants();
        loadAdminList(); // Add this line
    }

    // Load admins on admin page
    const isAdminPage = document.getElementById('admin-page')?.classList.contains('active');
    if (isAdminPage) {
        loadAdminList();
    }

    // Add logout handler
    const logoutBtn = document.querySelector('[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the chat page
    const isChatPage = document.querySelector('.chat-room') !== null;
    
    if (isChatPage) {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Auto-scroll to bottom when page loads
        setTimeout(scrollToBottom, 100);
    }

    // Load AI assistants and admins on home page
    const isHomePage = document.getElementById('home-page')?.classList.contains('active');
    if (isHomePage) {
        loadAIAssistants();
        loadAdminList(); // Add this line
    }

    // Load admins on admin page
    const isAdminPage = document.getElementById('admin-page')?.classList.contains('active');
    if (isAdminPage) {
        loadAdminList();
    }
});

// Show greeting sphere animation
function showGreetingSphere(assistantName) {
    const greetingContainer = document.getElementById('greeting-sphere');
    const greetingText = document.getElementById('greetingText');
    const svg = document.getElementById('greetingSphereSVG');
    const circle = document.getElementById('greetingSphereCircle');
    const shadow = document.getElementById('greetingSphereShadow');
    const eyeLeft = document.getElementById('eyeLeft');
    const eyeRight = document.getElementById('eyeRight');
     const chatId = `ai_${assistantName}`;
    const history = getChatHistory(chatId);

    // If there is chat history, do not show the greeting sphere
    if (history && history.length > 0) {
        if (greetingContainer) greetingContainer.style.display = 'none';
        return;
    }

    if (!greetingContainer || !greetingText || !svg || !circle || !shadow || !eyeLeft || !eyeRight) return;

    // Animate greeting text with typing effect
    animateGreetingTyping(`Halo! Saya ${assistantName}. Apa yang bisa aku bantu?`);

    // Reset SVG
    circle.setAttribute('r', 48);
    circle.setAttribute('fill', 'url(#sphereGradient)');
    circle.setAttribute('opacity', 1);
    shadow.setAttribute('rx', 32);
    shadow.setAttribute('opacity', 0.35);
    eyeLeft.setAttribute('x', 70 - 15 - GREETING_EYE_WIDTH / 2); // 70 is center, 15 is offset
    eyeRight.setAttribute('x', 70 + 15 - GREETING_EYE_WIDTH / 2);

    eyeLeft.setAttribute('y', 65);
    eyeRight.setAttribute('y', 65);

    greetingContainer.style.display = 'flex';

    // Remove previous animations
    anime.remove(circle);
    anime.remove(svg);
    anime.remove(shadow);
    anime.remove(eyeLeft);
    anime.remove(eyeRight);

    // Animate the sphere: pulse, color shift, floating, and shadow scaling
    anime({
        targets: circle,
        r: [
            { value: 48, duration: 0 },
            { value: 56, duration: 900, easing: 'easeInOutSine' },
            { value: 48, duration: 900, easing: 'easeInOutSine' }
        ],
        opacity: [
            { value: 1, duration: 0 },
            { value: 0.92, duration: 900, easing: 'easeInOutSine' },
            { value: 1, duration: 900, easing: 'easeInOutSine' }
        ],
        easing: 'easeInOutSine',
        loop: true,
        direction: 'alternate'
    });

    anime({
        targets: svg,
        translateY: [
            { value: 0, duration: 0 },
            { value: -18, duration: 1200, easing: 'easeInOutSine' },
            { value: 0, duration: 1200, easing: 'easeInOutSine' }
        ],
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutSine'
    });

    anime({
        targets: shadow,
        rx: [
            { value: 32, duration: 0 },
            { value: 40, duration: 1200, easing: 'easeInOutSine' },
            { value: 32, duration: 1200, easing: 'easeInOutSine' }
        ],
        opacity: [
            { value: 0.35, duration: 0 },
            { value: 0.18, duration: 1200, easing: 'easeInOutSine' },
            { value: 0.35, duration: 1200, easing: 'easeInOutSine' }
        ],
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutSine'
    });

    // Eye blinking animation (both eyes blink together)
    function blinkEyes() {
        anime({
            targets: [eyeLeft, eyeRight],
            height: [
                { value: 2, duration: 120, easing: 'easeInOutQuad' },
                { value: 16, duration: 180, easing: 'easeInOutQuad' }
            ],
            y: [
                { value: 73, duration: 120, easing: 'easeInOutQuad' },
                { value: 65, duration: 180, easing: 'easeInOutQuad' }
            ],
            delay: 0,
            complete: () => {
                // Blink again after a random interval
                setTimeout(blinkEyes, 1800 + Math.random() * 1200);
            }
        });
    }
    // Start blinking after a short delay
    setTimeout(blinkEyes, 1200);

    // Animate greeting text with typing effect (already called above)
        greetingContainer.style.display = 'flex';

}

// Hide greeting sphere animation
function hideGreetingSphere() {
    const greetingContainer = document.getElementById('greeting-sphere');
    if (greetingContainer) {
        greetingContainer.style.display = 'none';
    }
    // Remove anime.js animations
    anime.remove('#greetingSphereCircle');
    anime.remove('#greetingSphereSVG');
}

// Show greeting when opening chat, hide on first user message
const originalOpenChat = openChat;
openChat = function(type, name) {
    originalOpenChat(type, name);
    if (type === 'ai') {
        showGreetingSphere(name);
    } else {
        hideGreetingSphere();
    }
};

// Hide greeting when user sends first message in AI chat
const originalSendMessage = sendMessage;
let greetingDismissed = false;
sendMessage = function() {
    if (currentChatType === 'ai' && !greetingDismissed) {
        hideGreetingSphere();
        greetingDismissed = true;
    }
    originalSendMessage.apply(this, arguments);
};

// Reset greetingDismissed when switching AI assistant
const originalLoadAIMessages = loadAIMessages;
loadAIMessages = function(assistantName) {
    greetingDismissed = false;
    originalLoadAIMessages.apply(this, arguments);
};

// Check login status and show modal if not logged in
document.addEventListener('DOMContentLoaded', async function() {
    // Only run on ngobras.html
    if (!window.location.pathname.includes('ngobras')) return;

    // Ensure Supabase is loaded
    if (typeof supabase === 'undefined') {
        await new Promise(res => setTimeout(res, 300)); // Wait for supabase to load
    }
    // Get config from backend
    let config;
    try {
        const resp = await fetch('/api/supabase-config');
        config = await resp.json();
    } catch (e) {
        config = null;
    }
    if (!config || !config.url || !config.anonKey) return;

    // Inisialisasi client hanya sekali, simpan di window
    if (!window.supabaseClient) {
        window.supabaseClient = supabase.createClient(config.url, config.anonKey);
    }
    const supabaseClient = window.supabaseClient;

    // Check user session
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('authModal'), {
            backdrop: 'static',
            keyboard: false
        });
        modal.show();

        // Button handlers
        document.getElementById('loginEmailBtn').onclick = function() {
            window.location.href = '/login.html';
        };
        document.getElementById('loginGoogleBtn').onclick = async function() {
            await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/ngobras'
                }
            });
        };
        console.log('User is not logged in.');
        return;
    }

    // Setelah user login, simpan userId ke localStorage jika belum ada
    let userProfileStr = localStorage.getItem('ngobras_user_profile');
    if (!userProfileStr) {
        localStorage.setItem('ngobras_user_profile', JSON.stringify(user));
    }

    // --- SUBSCRIBE REALTIME KE SEMUA ADMIN ---
    try {
        const adminResp = await fetch('/api/admins');
        const admins = await adminResp.json();
        if (Array.isArray(admins) && admins.length > 0) {
            // Logging admin IDs
            console.log('[NGOBRAS] Admin IDs:', admins.map(a => a.id));
            // Import subscribeToAdminMessages dari ngobras.chat.js jika belum ada
            if (typeof subscribeToAdminMessages === 'undefined') {
                // Dynamic import jika perlu (untuk browser, pastikan sudah di-load di HTML)
                console.warn('subscribeToAdminMessages belum terdefinisi! Pastikan ngobras.chat.js sudah di-load sebelum ngobras.js');
            } else {
                admins.forEach(admin => {
                    subscribeToAdminMessages(user.id, admin.id)
                        .then(() => console.log(`[NGOBRAS] Subscribe realtime ke admin ${admin.id} success`))
                        .catch(e => console.warn(`[NGOBRAS] Subscribe realtime ke admin ${admin.id} FAILED:`, e));
                });
            }
        } else {
            console.warn('[NGOBRAS] Tidak ada admin ditemukan untuk subscribe realtime.');
        }
    } catch (e) {
        console.error('[NGOBRAS] Gagal fetch admin list:', e);
    }

    // Tidak perlu subscribe lagi di openChat, cukup load pesan saja jika adminId sudah ada
    const adminId = localStorage.getItem('ngobras_current_admin_id');
    if (adminId) {
        await loadAdminMessagesFromDB(user.id, adminId);
    }
});

function showAuthModal() {
    const modal = new bootstrap.Modal(document.getElementById('authModal'), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
}

document.addEventListener('DOMContentLoaded', function() {

    if (loginEmailBtn) {
        loginEmailBtn.onclick = function() {
            window.location.href = '/login.html';
        };
    }
    if (loginGoogleBtn) {
        loginGoogleBtn.onclick = async function() {
            // Wait for Supabase config and client
            if (typeof supabase === 'undefined') return;
            let config;
            try {
                const resp = await fetch('/api/supabase-config');
                config = await resp.json();
            } catch (e) {
                config = null;
            }
            if (!config || !config.url || !config.anonKey) return;
            const supabaseClient = supabase.createClient(config.url, config.anonKey);
            await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/ngobras'
                }
            });
        };
    }
});

function animateGreetingTyping(text) {
    const greetingText = document.getElementById('greetingText');
    if (!greetingText) return;

    // Clear previous content
    greetingText.innerHTML = '';

    // Split text into words
    const words = text.split(' ');
    let charIndex = 0;
    words.forEach((word, wIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';
        wordSpan.style.whiteSpace = 'pre'; // preserve spaces if needed

        // For each character in the word
        for (let i = 0; i < word.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.innerHTML = word[i] === ' ' ? '&nbsp;' : word[i];
            charSpan.style.opacity = 0;
            charSpan.style.display = 'inline-block';
            charSpan.className = 'greeting-char';
            charSpan.dataset.charIndex = charIndex++;
            wordSpan.appendChild(charSpan);
        }

        // Add a space after each word except the last
        if (wIdx < words.length - 1) {
            const spaceSpan = document.createElement('span');
            spaceSpan.innerHTML = '&nbsp;';
            spaceSpan.style.opacity = 0;
            spaceSpan.style.display = 'inline-block';
            spaceSpan.className = 'greeting-char';
            spaceSpan.dataset.charIndex = charIndex++;
            wordSpan.appendChild(spaceSpan);
        }

        greetingText.appendChild(wordSpan);
    });

    // Animate each character with staggered fade-in and slight upward motion
    anime({
        targets: '.greeting-char',
        opacity: [0, 1],
        translateY: [10, 0],
        easing: 'easeOutExpo',
        duration: 320,
        delay: anime.stagger(22),
    });
}

// Eye configuration for greeting sphere
const GREETING_EYE_WIDTH = 11;      // px
const GREETING_EYE_HEIGHT = 19;    // px
const GREETING_EYE_RADIUS = 4.5;   // px (corner sharpness, 0 = sharp, half width = fully round)

function getMiniSphereSVG(id = '', extraClass = '', monochrome = false) {
    // id: unique id for this instance (for targeting animation)
    // extraClass: for additional CSS classes
    // monochrome: if true, use grayscale gradient
    return `
    <svg id="${id}" class="mini-sphere-avatar ${extraClass} ${monochrome ? 'mini-sphere-monochrome' : ''}" width="32" height="32" viewBox="0 0 140 140">
      <defs>
        <radialGradient id="miniSphereGradient${id}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${monochrome ? '#eee' : '#fff'}" stop-opacity="0.9"/>
          <stop offset="60%" stop-color="${monochrome ? '#bbb' : '#6C63FF'}" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="${monochrome ? '#888' : '#4a90e2'}" stop-opacity="1"/>
        </radialGradient>
        <linearGradient id="miniEyeGradient${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${monochrome ? '#fff' : '#fff'}"/>
          <stop offset="100%" stop-color="${monochrome ? '#ccc' : '#e0f7fa'}"/>
        </linearGradient>
      </defs>
      <circle id="${id}_circle" cx="70" cy="70" r="48" fill="url(#miniSphereGradient${id})" />
      <rect id="${id}_eyeLeft" x="54" y="68" width="7" height="12" rx="3.5" fill="url(#miniEyeGradient${id})" />
      <rect id="${id}_eyeRight" x="79" y="68" width="7" height="12" rx="3.5" fill="url(#miniEyeGradient${id})" />
    </svg>
    `;
}

// Animate the mini sphere (pulse + blink)
function animateMiniSphere(id) {
    const circle = document.getElementById(`${id}_circle`);
    const eyeLeft = document.getElementById(`${id}_eyeLeft`);
    const eyeRight = document.getElementById(`${id}_eyeRight`);
    if (!circle || !eyeLeft || !eyeRight) return;

    // Pulse animation
    anime({
        targets: circle,
        r: [
            { value: 48, duration: 0 },
            { value: 54, duration: 900, easing: 'easeInOutSine' },
            { value: 48, duration: 900, easing: 'easeInOutSine' }
        ],
        easing: 'easeInOutSine',
        loop: true,
        direction: 'alternate'
    });

    // Eye blinking
    function blink() {
        anime({
            targets: [eyeLeft, eyeRight],
            height: [
                { value: 2, duration: 120, easing: 'easeInOutSine' },
                { value: 12, duration: 180, easing: 'easeInOutSine' }
            ],
            delay: 0,
            complete: () => {
                setTimeout(blink, 1800 + Math.random() * 1200);
            }
        });
    }
    setTimeout(blink, 1200 + Math.random() * 800);
}

// === Greeting Sphere Eye Follow Animation ===
(function() {
    // Eye config (should match your SVG)
    const EYE_WIDTH = 9;
    const EYE_HEIGHT = 16;
    const EYE_RADIUS = 4.5;
    const EYE_Y = 65;
    const EYE_OFFSET_X = 15; // distance from center to each eye
    const EYE_CENTER_Y = EYE_Y + EYE_HEIGHT / 2;
    const SPHERE_CENTER_X = 70;
    const SPHERE_CENTER_Y = 70;
    const EYE_MOVE_RADIUS = 10; // max px the eye can move from its origin

    let lastTarget = { x: 0, y: 0 };

    function updateEyes(targetX, targetY) {
        // Clamp to circle
        const dist = Math.sqrt(targetX * targetX + targetY * targetY);
        if (dist > EYE_MOVE_RADIUS) {
            targetX = targetX * EYE_MOVE_RADIUS / dist;
            targetY = targetY * EYE_MOVE_RADIUS / dist;
        }

        // Animate both eyes
        anime({
            targets: '#eyeLeft',
            x: SPHERE_CENTER_X - EYE_OFFSET_X - EYE_WIDTH / 2 + targetX,
            y: EYE_Y + targetY,
            duration: 300,
            easing: 'easeOutQuad'
        });
        anime({
            targets: '#eyeRight',
            x: SPHERE_CENTER_X + EYE_OFFSET_X - EYE_WIDTH / 2 + targetX,
            y: EYE_Y + targetY,
            duration: 300,
            easing: 'easeOutQuad'
        });
    }

    function handlePointerMove(e) {
        const sphere = document.getElementById('greetingSphereSVG');
        if (!sphere) return;
        const rect = sphere.getBoundingClientRect();
        // Get pointer position
        let clientX, clientY;
        if (e.touches && e.touches.length) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        // Calculate relative to sphere center
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        // Normalize to [-1, 1]
        const nx = dx / (rect.width / 2);
        const ny = dy / (rect.height / 2);
        // Target movement
        const targetX = nx * EYE_MOVE_RADIUS;
        const targetY = ny * EYE_MOVE_RADIUS;
        lastTarget = { x: targetX, y: targetY };
        updateEyes(targetX, targetY);
    }

    function resetEyes() {
        updateEyes(0, 0);
    }

    // Attach listeners when greeting sphere is shown
    function enableEyeFollow() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        chatMessages.addEventListener('mousemove', handlePointerMove);
        chatMessages.addEventListener('touchmove', handlePointerMove, { passive: false });
        chatMessages.addEventListener('mouseleave', resetEyes);
        chatMessages.addEventListener('touchend', resetEyes);
    }
    function disableEyeFollow() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        chatMessages.removeEventListener('mousemove', handlePointerMove);
        chatMessages.removeEventListener('touchmove', handlePointerMove);
        chatMessages.removeEventListener('mouseleave', resetEyes);
        chatMessages.removeEventListener('touchend', resetEyes);
        resetEyes();
    }

    // Hook into greeting sphere show/hide
    const originalShowGreetingSphere = window.showGreetingSphere;
    window.showGreetingSphere = function() {
        originalShowGreetingSphere.apply(this, arguments);
        setTimeout(enableEyeFollow, 100);
    };
    const originalHideGreetingSphere = window.hideGreetingSphere;
    window.hideGreetingSphere = function() {
        originalHideGreetingSphere.apply(this, arguments);
        disableEyeFollow();
    };
})();

// Logout modal
function showLogoutModal() {
    const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
    modal.show();
}

document.addEventListener('DOMContentLoaded', function() {
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    if (confirmBtn) {
        confirmBtn.onclick = async function() {
            // Optional: Add Supabase sign out if used
            if (typeof supabaseClient !== 'undefined' && supabaseClient?.auth) {
                await supabaseClient.auth.signOut();
            }
            // Clear localStorage/session if needed
            localStorage.clear();
            // Redirect to login page
            window.location.href = '/login.html';
        };
    }
});

// --- Realtime Supabase Chat Subscription ---
// (DIPINDAHKAN KE ngobras.chat.js AGAR TIDAK DOUBLE)
// let chatSubscription = null;

// async function subscribeToAdminMessages(userId, adminId) {
//     // Pastikan client sudah ada
//     if (!window.supabaseClient) {
//         throw new Error('Supabase client not initialized');
//     }
//     // Unsubscribe previous
//     if (chatSubscription) {
//         await chatSubscription.unsubscribe();
//         chatSubscription = null;
//     }
//     // Logging subscription
//     console.log('[Realtime] Subscribing to messages for user:', userId, 'admin:', adminId);
//     chatSubscription = window.supabaseClient
//         .channel('messages')
//         .on('postgres_changes', {
//             event: 'INSERT',
//             schema: 'public',
//             table: 'messages',
//             filter: `receiver_id=eq.${userId},sender_id=eq.${adminId}`
//         }, payload => {
//             console.log('[Realtime] Received message (admin > user):', payload);
//             // Simpan pesan baru ke localStorage
//             const chatKey = `ngobras_admin_chat_${userId}_${adminId}`;
//             let messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
//             messages.push(payload.new);
//             localStorage.setItem(chatKey, JSON.stringify(messages));
//             // Render pesan baru ke chat room
//             const isSent = payload.new.sender_id === userId;
//             addMessage(payload.new.content, isSent);
//             scrollToBottom();
//         })
//         .on('postgres_changes', {
//             event: 'INSERT',
//             schema: 'public',
//             table: 'messages',
//             filter: `sender_id=eq.${userId},receiver_id=eq.${adminId}`
//         }, payload => {
//             console.log('[Realtime] Sent message (user > admin):', payload);
//             // Simpan pesan baru ke localStorage
//             const chatKey = `ngobras_admin_chat_${userId}_${adminId}`;
//             let messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
//             messages.push(payload.new);
//             localStorage.setItem(chatKey, JSON.stringify(messages));
//             // Render pesan baru ke chat room
//             const isSent = payload.new.sender_id === userId;
//             addMessage(payload.new.content, isSent);
//             scrollToBottom();
//         })
//         .subscribe(status => {
//             if (status === 'SUBSCRIBED') {
//                 console.log('[Realtime] Subscription success');
//             } else {
//                 console.warn('[Realtime] Subscription status:', status);
//             }
//         });
// }

// Update openChat to subscribe realtime
window._originalOpenChat = window.openChat;
window.openChat = async function(type, name, assistantId) {
    if (type !== 'ai') {
        let adminId = null;
        try {
            const res = await fetch('/api/admins');
            const admins = await res.json();
            const found = admins.find(a => (a.full_name || a.username) === name);
            if (found) {
                adminId = found.id;
            }
        } catch (e) { console.error('Error fetching admins:', e); }
        window.currentAdminId = adminId;
        if (adminId) {
            localStorage.setItem('ngobras_current_admin_id', adminId);
            const userProfileStr = localStorage.getItem('ngobras_user_profile');
            const userId = userProfileStr ? JSON.parse(userProfileStr).id : null;
            if (userId) {
                await loadAdminMessagesFromDB(userId, adminId);
            }
        }
    }
    window._originalOpenChat(type, name, assistantId);
};