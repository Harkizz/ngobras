// JavaScript for ngobras.html page
// =====================================
// This file handles all chat logic, UI updates, and Supabase integration for the NGOBRAS chat application.
// It manages AI and admin chat, emoji picker, file uploads, profile, and greeting sphere animation.

// --- GLOBAL STATE ---
let currentChatType = 'admin'; // 'ai' or 'admin' - which chat is currently open
let currentChatName = '';      // Name of the current chat (AI assistant or admin)
let chatHistory = {};          // Store chat messages for each assistant/admin (in-memory, not used for persistence)

// --- MEMORY HELPERS ---
/**
 * Retrieve chat history for a given chatId from localStorage.
 * @param {string} chatId - The unique chat identifier (e.g., 'ai_AssistantName' or 'admin_AdminName')
 * @returns {Array} Array of message objects
 */
function getChatHistory(chatId) {
    const key = `ngobras_chat_history_${chatId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

/**
 * Save a new chat message to localStorage for a given chatId.
 * @param {string} chatId - The unique chat identifier
 * @param {string} text - The message text
 * @param {boolean} isSent - True if sent by user, false if received
 */
function saveChatMessage(chatId, text, isSent) {
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

// --- LOAD MESSAGES FOR AI CHAT ---
/**
 * Load and render all messages for the current AI assistant chat.
 * @param {string} assistantName - Name of the AI assistant (defaults to currentChatName)
 */
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

// --- NAVIGATION ---
/**
 * Show a specific page (e.g., 'chat', 'home', 'profile') and update navigation UI.
 * @param {string} page - The page to show
 */
function showPage(page) {
    // First check if nav items exist before trying to modify them
    const navItems = document.querySelectorAll('.nav-item');
    const bottomNav = document.querySelector('.bottom-nav');
    const topBar = document.querySelector('.top-bar');

    if (page === 'chat') {
        // Hide bottom nav and top bar in chat page
        if (bottomNav) bottomNav.style.display = 'none';
        if (topBar) topBar.style.display = 'none';
        
        // Adjust main content margin when top bar is hidden
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginTop = '0';
        }
    } else {
        // Show bottom nav and top bar in other pages
        if (bottomNav) bottomNav.style.display = 'flex';
        if (topBar) topBar.style.display = 'flex';
        
        // Reset main content margin
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.marginTop = '60px';
        }
    }

    if (navItems) {
        // Remove active class from all nav items
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked nav item if it exists
        const clickedItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (clickedItem) {
            clickedItem.classList.add('active');
        }
    }
    
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    if (pages) {
        pages.forEach(p => {
            p.classList.remove('active');
        });
    }
    
    // Show selected page
    const targetPage = document.getElementById(`${page}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    if (page === 'profile') {
        initializeSupabase(); // Load profile data when profile page is shown
    }
}

// --- OPEN CHAT ---
/**
 * Open a chat with either an AI assistant or an admin, update UI and state.
 * @param {string} type - 'ai' or 'admin'
 * @param {string} name - Name of the assistant or admin
 * @param {string} assistantId - (optional) ID of the AI assistant
 */
async function openChat(type, name, assistantId) {
    currentChatType = type;
    currentChatName = name;
    if (type === 'ai') {
        window.currentAssistantId = assistantId;
        loadAIMessages(name);
        window.currentAdminId = null; // Clear admin ID if switching to AI
        // Remove admin ID from localStorage if switching to AI
        if (localStorage.getItem('ngobras_current_admin_id')) {
            localStorage.removeItem('ngobras_current_admin_id');
            console.log("Admin ID returned");
        }
    } else {
        // Find admin by name to get their ID
        let adminId = null;
        try {
            const res = await fetch('/api/admins');
            const admins = await res.json();
            const found = admins.find(a => (a.full_name || a.username) === name);
            if (found) {
                adminId = found.id; // <-- FIXED: assign adminId
            }
        } catch (e) {
            console.error('Error fetching admins:', e);
        }
        window.currentAdminId = adminId;
        if (adminId) {
            // Save admin ID to localStorage for later use
            localStorage.setItem('ngobras_current_admin_id', adminId);
            // Get user ID from localStorage
            const userProfileStr = localStorage.getItem('ngobras_user_profile');
            const userId = userProfileStr ? JSON.parse(userProfileStr).id : null;
            if (userId) {
                // Load messages from DB and log to console
                await loadAdminMessagesFromDB(userId, adminId);
            } else {
                console.log("User ID not found");
            }
        } else {
            console.log("Admin ID not found");
        }
    }

    const chatNameEl = document.getElementById('current-chat-name');
    const avatar = document.getElementById('current-chat-avatar');
    const status = document.getElementById('current-chat-status');
    const messagesList = document.getElementById('messages-list');
    if (messagesList) messagesList.innerHTML = ''; // <-- Clear messages

    if (chatNameEl) chatNameEl.textContent = name;

    if (avatar && status) {
        if (type === 'ai') {
            avatar.className = 'chat-avatar ai';
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
            status.textContent = 'AI Assistant - Online';
            loadAIMessages(name);
        } else {
            avatar.className = 'chat-avatar admin';
            avatar.innerHTML = '<i class="fas fa-user-md"></i>';
            status.textContent = 'Online';
            loadAdminMessages(name);
        }
    }

    // Switch to chat page
    showPage('chat');

    // Clear unread indicators if they exist
    const chatItems = document.querySelectorAll('.chat-item');
    const unreadCounts = document.querySelectorAll('.unread-count');

    chatItems.forEach(item => {
        if (item) item.classList.remove('unread');
    });

    unreadCounts.forEach(badge => {
        if (badge) badge.style.display = 'none';
    });

    // Save last opened chat to localStorage
    localStorage.setItem('ngobras_last_chat', JSON.stringify({ type, name }));
}

// --- GO BACK TO HOME ---
/**
 * Return from chat to home page, clear admin chat state if needed.
 */
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

/**
 * Render admin messages from localStorage to the chat UI.
 */
function renderAdminMessagesFromLocalStorage() {
    const messagesList = document.getElementById('messages-list');
    const userProfileStr = localStorage.getItem('ngobras_user_profile');
    const userId = userProfileStr ? JSON.parse(userProfileStr).id : null;
    const adminId = localStorage.getItem('ngobras_current_admin_id');
    const chatKey = `ngobras_admin_chat_${userId}_${adminId}`;
    const messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    messagesList.innerHTML = '';
    messages.forEach(msg => {
        const isSent = msg.sender_id === userId;
        addMessage(msg.content, isSent);
    });
    scrollToBottom();
}

// --- SWITCH CHAT TYPE ---
/**
 * Switch the chat UI to AI assistant mode.
 */
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

/**
 * Switch the chat UI to admin mode.
 */
function switchToAdmin() {
    currentChatType = 'admin';
    loadAdminMessages(currentChatName);
    
    // Update header
    const avatar = document.getElementById('current-chat-avatar');
    const status = document.getElementById('current-chat-status');
    
    avatar.className = 'chat-avatar admin';
    avatar.innerHTML = '<i class="fas fa-user-md"></i>';
    document.getElementById('current-chat-name').textContent = currentChatName || 'Dr. Sarah Wijaya';
    status.textContent = 'Online';
    
    // Update switch buttons
    document.querySelector('.switch-btn.admin').classList.add('active');
    document.querySelector('.switch-btn.ai').classList.remove('active');
}

// --- LOAD ADMIN MESSAGES ---
/**
 * Load and render all messages for the current admin chat.
 * @param {string} adminName - Name of the admin (defaults to currentChatName)
 */
function loadAdminMessages(adminName = currentChatName) {
    const messagesList = document.getElementById('messages-list');
    const chatId = `admin_${adminName}`;
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

// --- SEND MESSAGE ---
/**
 * Send a message in the current chat (AI or admin), handle memory, UI, and API calls.
 * Handles both AI chat (calls /api/chat) and admin chat (inserts to Supabase).
 */
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    const photo = window._ngobrasPhotoPreview;
    if (!message && !photo) return;

    const chatId = currentChatType === 'ai' ? `ai_${currentChatName}` : `admin_${currentChatName}`;

    // Save user message to memory and UI
    if (photo && !message) {
        saveChatMessage(chatId, '[Photo]', true);
        addMessage('[Photo]', true);
    } else {
        saveChatMessage(chatId, message, true);
        addMessage(message, true);
    }
    input.value = '';
    removePhotoPreview();

    if (currentChatType === 'ai') {
        showTypingIndicator();
        try {
            // Get assistant ID
            let assistantId = window.currentAssistantId;
            if (!assistantId) {
                const res = await fetch('/api/ai-assistants');
                const assistants = await res.json();
                const found = assistants.find(a => a.name === currentChatName);
                assistantId = found ? found.id : null;
            }
            if (!assistantId) throw new Error('AI Assistant not found.');

            // Restore memory: all previous turns (excluding just-sent user message)
            let memory = getChatHistory(chatId)
                .slice(0, -1)
                .map(msg => ({
                    role: msg.isSent ? 'user' : 'assistant',
                    content: msg.text
                }));

            // Prepare payload
            const payload = {
                message,
                assistant_id: assistantId,
                memory
            };
            if (photo && photo.dataUrl) {
                payload.image = photo.dataUrl;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('AI server error');
            const data = await response.json();
            hideTypingIndicator();

            if (data.reply) {
                saveChatMessage(chatId, data.reply, false);
                addMessage(data.reply, false);
            } else {
                addAIResponse(message);
            }
        } catch (err) {
            hideTypingIndicator();
            addAIResponse(message);
            console.error('Error sending AI message:', err);
        }
    } else {
        // --- ADMIN CHAT: Kirim ke Supabase langsung dari client ---
        showTypingIndicator();
        try {
            // 1. Ensure supabaseClient is initialized
            if (!window.supabaseClient) {
                const resp = await fetch('/api/supabase-config');
                const config = await resp.json();
                if (window.supabase && config.url && config.anonKey) {
                    window.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
                } else {
                    hideTypingIndicator();
                    showAuthModal();
                    console.log('Supabase client not initialized');
                    return;
                }
            }

            // 2. Get sender_id from localStorage (already saved after login)
            let sender_id = null;
            let sender_username = '';
            const userProfileStr = localStorage.getItem('ngobras_user_profile');
            if (userProfileStr) {
                const userProfile = JSON.parse(userProfileStr);
                sender_id = userProfile.id;
                sender_username = userProfile.full_name || userProfile.username || userProfile.email || sender_id;
            } else {
                // Fallback: try to get from Supabase session
                const { data, error } = await window.supabaseClient.auth.getUser();
                if (error || !data?.user?.id) {
                    hideTypingIndicator();
                    showAuthModal();
                    console.log('User session not found or expired');
                    return;
                }
                sender_id = data.user.id;
                // Optionally fetch profile for username
                const res = await fetch(`/api/profiles/${sender_id}`);
                if (res.ok) {
                    const userProfile = await res.json();
                    sender_username = userProfile.full_name || userProfile.username || userProfile.email || sender_id;
                }
            }

            // 3. Get receiver_id (admin) from localStorage (already saved when opening chat)
            let receiver_id = localStorage.getItem('ngobras_current_admin_id');
            let admin_username = '';
            if (receiver_id) {
                // Optionally fetch admin profile for username
                const res = await fetch(`/api/profiles/${receiver_id}`);
                if (res.ok) {
                    const adminProfile = await res.json();
                    admin_username = adminProfile.full_name || adminProfile.username || adminProfile.email || receiver_id;
                }
            }

            if (!sender_id || !receiver_id) {
                console.log(`(${sender_username}) failed to save message to (${admin_username})`);
                hideTypingIndicator();
                showFastPopup('Gagal mengirim pesan: ID admin tidak ditemukan.');
                return;
            }

            // 4. Insert message directly to Supabase (client-side)
            const { data, error } = await window.supabaseClient
                .from('messages')
                .insert([{
                    sender_id,
                    receiver_id,
                    content: message,
                    chat_type: 'admin'
                }]);

            if (error) {
                console.log('Supabase error:', error);
                showFastPopup('Gagal mengirim pesan: ' + (error.message || 'Unknown error'));
            } else {
                console.log(`(${sender_username}) successfully saved message to (${admin_username})`);
            }

            hideTypingIndicator();
        } catch (err) {
            hideTypingIndicator();
            console.log('(unknown user) failed to save message to (unknown admin)');
            addAdminResponse(message); // fallback jika gagal
            error.message = error.message || 'Unknown error';
        }
    }
    scrollToBottom();
}

// --- FORMAT AI RESPONSE ---
/**
 * Format AI response text with markdown-like rules for display in chat bubbles.
 * @param {string} text - The AI response text
 * @returns {string} HTML-formatted string
 */
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

/**
 * Copy the content of a special AI solution card to clipboard.
 * @param {string} cardId - The DOM id of the card
 */
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

// --- ADD MESSAGE TO CHAT UI ---
/**
 * Add a message bubble to the chat UI (sent or received).
 * @param {string} text - The message text
 * @param {boolean} isSent - True if sent by user, false if received
 */
function addMessage(text, isSent = false) {
    const messagesList = document.getElementById('messages-list');
    const messageDiv = document.createElement('div');
    const currentTime = new Date().toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    if (isSent) {
        messageDiv.className = 'message sent fade-in';
        messageDiv.innerHTML = `
            <div>
                <div class="message-bubble">${text}</div>
                <div class="message-time">${currentTime}</div>
            </div>
        `;
        messagesList.appendChild(messageDiv);
    } else {
        const avatarClass = currentChatType === 'ai' ? 'ai' : 'admin';
        const messageClass = currentChatType === 'ai' ? 'message received ai fade-in-down' : 'message received fade-in-down';
        const formatted = currentChatType === 'ai' ? formatAIResponse(text) : text;

        let avatarHTML = '';
        let sphereId = '';
        if (currentChatType === 'ai') {
            // --- DISABLE PREVIOUS MINI SPHERE ANIMATION ---
            const prevAI = Array.from(messagesList.querySelectorAll('.message.received.ai .mini-sphere-avatar:not(.mini-sphere-monochrome)'));
            if (prevAI.length > 0) {
                const prevSphere = prevAI[prevAI.length - 1];
                prevSphere.classList.add('mini-sphere-monochrome');
                // Remove anime.js animations
                anime.remove(prevSphere);
                anime.remove(prevSphere.querySelector('circle'));
                anime.remove(prevSphere.querySelector('rect'));
            }

            // --- ADD NEW MINI SPHERE (ANIMATED) ---
            sphereId = `miniSphere_${Date.now()}_${Math.floor(Math.random()*10000)}`;
            avatarHTML = getMiniSphereSVG(sphereId, '', false);
            setTimeout(() => animateMiniSphere(sphereId), 10);
        } else {
            avatarHTML = '<i class="fas fa-user-md"></i>';
        }

        messageDiv.className = messageClass;
        messageDiv.innerHTML = `
            <div class="message-avatar ${avatarClass}">
                ${avatarHTML}
            </div>
            <div>
                <div class="message-bubble">${formatted}</div>
                <div class="message-time">${currentTime}</div>
            </div>
        `;
        messagesList.appendChild(messageDiv);

        // Animate fade-down using Anime.js
        anime({
            targets: messageDiv,
            opacity: [0, 1],
            translateY: [-24, 0],
            duration: 500,
            easing: 'easeOutCubic'
        });
    }
    scrollToBottom();
}

// --- AI & ADMIN AUTO-RESPONSE HELPERS ---
/**
 * Add a random AI response to the chat (fallback for errors).
 * @param {string} userMessage - The user's message
 */
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

/**
 * Add a random admin response to the chat (fallback for errors).
 * @param {string} userMessage - The user's message
 */
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

// --- LOAD ADMIN MESSAGES FROM SUPABASE DB ---
/**
 * Load messages for a user-admin chat from the Supabase database (not used for rendering, just logs).
 * @param {string} userId - User ID
 * @param {string} adminId - Admin ID
 */
async function loadAdminMessagesFromDB(userId, adminId) {
    try {
        const res = await fetch(`/api/messages/${userId}/${adminId}`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const messages = await res.json();
        console.log('Messages between user and admin:', messages); // <-- LOG TO CONSOLE
        // Optionally, render messages to UI here
    } catch (err) {
        console.error('Error loading messages from DB:', err);
    }
}

// --- TYPING INDICATOR ---
/**
 * Show the typing indicator in the chat UI (AI or admin).
 */
function showTypingIndicator() {
    let indicator = document.getElementById('typing-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'typing-indicator';
    }
    if (currentChatType === 'ai') {
        const sphereId = 'typingMiniSphere';
        indicator.innerHTML = `
            <div class="message-avatar ai">
                ${getMiniSphereSVG(sphereId)}
            </div>
            <div>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span style="margin-left: 0.5rem; font-size: 0.8rem; color: #6C757D;">mengetik...</span>
            </div>
        `;
        setTimeout(() => animateMiniSphere(sphereId), 10);
    } else {
        const avatarClass = currentChatType === 'ai' ? 'ai' : 'admin';
        const iconClass = currentChatType === 'ai' ? 'fas fa-robot' : 'fas fa-user-md';

        indicator.innerHTML = `
            <div class="message-avatar ${avatarClass}">
                <i class="${iconClass}"></i>
            </div>
            <div>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span style="margin-left: 0.5rem; font-size: 0.8rem; color: #6C757D;">mengetik...</span>
            </div>
        `;
    }
    indicator.style.display = 'flex';

    // Insert after the last message in chat-messages
    const messagesContainer = document.getElementById('chat-messages');
    // Remove existing indicator if any
    if (indicator.parentNode) indicator.parentNode.removeChild(indicator);
    // Find the last message element
    const lastMessage = messagesContainer.querySelector('.message:last-child');
    if (lastMessage) {
        lastMessage.after(indicator);
    } else {
        messagesContainer.appendChild(indicator);
    }
    scrollToBottom();
}

/**
 * Hide the typing indicator from the chat UI.
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator && indicator.parentNode) {
        indicator.style.display = 'none';
        indicator.parentNode.removeChild(indicator);
    }
}

// --- INPUT HANDLERS ---
/**
 * Handle Enter key press in the message input to send message.
 * @param {KeyboardEvent} event
 */
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

/**
 * Utility function to safely get DOM elements by id, with debug logging if not found.
 * @param {string} id - The element id
 * @returns {HTMLElement|null}
 */
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.debug(`Element with id '${id}' not found - this is expected on non-chat pages`);
        return null;
    }
    return element;
}

/**
 * Scroll the chat messages container to the bottom.
 */
function scrollToBottom() {
    const messagesContainer = getElement('chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// --- EMOJI PICKER ---
// List of emojis for the picker
const EMOJI_LIST = [
    "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","😡","😠","🤬","😷","🤒","🤕","🤢","🤮","🥴","😇","🥳","🥺","🤠","🤡","🤥","🤫","🤭","🧐","🤓","😈","👿","👹","👺","💀","👻","👽","🤖","💩","😺","😸","😹","😻","😼","😽","🙀","😿","😾"
];

/**
 * Toggle the emoji picker visibility.
 */
function toggleEmoji() {
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;
    if (picker.style.display === 'none' || picker.style.display === '') {
        showEmojiPicker();
    } else {
        hideEmojiPicker();
    }
}

/**
 * Show the emoji picker and populate it if needed.
 */
function showEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;
    // Populate emoji options if not already
    if (!picker.hasChildNodes()) {
        EMOJI_LIST.forEach(emoji => {
            const btn = document.createElement('span');
            btn.className = 'emoji-option';
            btn.textContent = emoji;
            btn.onclick = function(e) {
                e.stopPropagation();
                insertEmojiToInput(emoji);
                // Do NOT hide the picker here
            };
            picker.appendChild(btn);
        });
    }
    picker.style.display = 'flex';

    // Click outside to close
    setTimeout(() => {
        document.addEventListener('mousedown', handleEmojiOutsideClick);
    }, 10);
}

/**
 * Hide the emoji picker.
 */
function hideEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.style.display = 'none';
    document.removeEventListener('mousedown', handleEmojiOutsideClick);
}

/**
 * Handle click outside the emoji picker to close it.
 * @param {MouseEvent} e
 */
function handleEmojiOutsideClick(e) {
    const picker = document.getElementById('emoji-picker');
    const emojiBtn = document.querySelector('.action-btn i.fa-smile');
    if (picker && !picker.contains(e.target) && (!emojiBtn || !emojiBtn.parentNode.contains(e.target))) {
        hideEmojiPicker();
    }
}

/**
 * Insert an emoji into the message input at the cursor position.
 * @param {string} emoji
 */
function insertEmojiToInput(emoji) {
    const input = document.getElementById('messageInput');
    if (!input) return;
    // Insert at cursor position
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.slice(0, start) + emoji + text.slice(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + emoji.length;
}

// --- NOTIFICATIONS ---
/**
 * Show a simple notification alert (placeholder for real notifications).
 */
function showNotifications() {
    alert('Notifikasi:\n• Dr. Sarah Wijaya mengirim pesan baru\n• Jadwal konsultasi minggu depan\n• Tips kesehatan mental harian');
}

// --- LOAD AI ASSISTANTS ---
/**
 * Fetch and render the list of available AI assistants from the backend.
 */
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

// --- LOAD ADMINS ---
/**
 * Fetch and render the list of available admins from the backend.
 */
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
            </div>
        `;
        
        adminListContainer.appendChild(adminCard);
    });
}

// --- SUPABASE INITIALIZATION ---
/**
 * Wait for the Supabase library to be loaded before continuing.
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries (ms)
 * @returns {Promise}
 */
function waitForSupabase(retries = 10, delay = 200) {
    return new Promise((resolve, reject) => {
        function check() {
            if (typeof supabase !== 'undefined') {
                resolve();
            } else if (retries > 0) {
                setTimeout(() => check(--retries, delay), delay);
            } else {
                reject(new Error('Supabase library failed to load.'));
            }
        }
        check();
    });
}

// Supabase client instance
let supabaseClient;

/**
 * Initialize Supabase client and check user authentication. Loads user profile if authenticated.
 */
async function initializeSupabase() {
    try {
        await waitForSupabase();
        const response = await fetch('/api/supabase-config');
        const config = await response.json();
        supabaseClient = supabase.createClient(config.url, config.anonKey);
        // Check if user is authenticated
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) throw error;
        if (user) {
            await loadUserProfile(user.id);
        } else {
            // Redirect to login if not authenticated
            window.location.href = '/login.html';
        }
    } catch (error) {
        document.body.innerHTML = '<div class="alert alert-danger text-center"><h4>Application Error</h4><p>Failed to load required libraries. Please refresh the page.</p><button onclick="window.location.reload()" class="btn btn-primary">Refresh</button></div>';
        console.error('Supabase initialization error:', error);
    }
}

/**
 * Load the user's profile from Supabase and update the UI.
 * @param {string} userId - The user's ID
 */
async function loadUserProfile(userId) {
    try {
        showProfileLoading(true);

        // Fetch profile data
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // If profile is missing, treat as not logged in
        if (error && error.code === 'PGRST116') {
            await supabaseClient.auth.signOut();
            showAuthModal();
            return;
        }
        if (error) {
            // Show login modal for any error
            showAuthModal();
            return;
        }
        if (!profile) {
            showAuthModal();
            return;
        }

        // Update UI with profile data
        updateProfileUI(profile);

        // Fetch chat statistics
        const { data: chatStats, error: statsError } = await supabaseClient
            .from('messages')
            .select('created_at')
            .eq('sender_id', userId);

        updateProfileStats(chatStats);

    } catch (error) {
        // Show login modal on error
        showAuthModal();
    } finally {
        showProfileLoading(false);
    }
}

/**
 * Update the profile UI with user data.
 * @param {Object} profile - The user's profile object
 */
function updateProfileUI(profile) {
    // Update basic info
    document.getElementById('profileName').textContent = profile.full_name || 'No Name Set';
    document.getElementById('profileEmail').textContent = profile.email || '';
    
    // Update avatar
    const avatarImg = document.getElementById('profileAvatar');
    if (profile.avatar_url) {
        avatarImg.src = profile.avatar_url;
    }
    
    // Update member since date
    const memberSince = new Date(profile.created_at).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long'
    });
    document.getElementById('profileMemberSince').textContent = `Member since ${memberSince}`;
}

/**
 * Update the profile statistics UI (total chats, last active).
 * @param {Array} chatStats - Array of chat message objects
 */
function updateProfileStats(chatStats) {
    if (!chatStats) return;
    
    // Update total chats
    document.getElementById('totalChats').textContent = chatStats.length;
    
    // Update last active
    if (chatStats.length > 0) {
        const lastActive = new Date(Math.max(...chatStats.map(chat => new Date(chat.created_at))));
        document.getElementById('lastActive').textContent = lastActive.toLocaleDateString('id-ID');
    }
}

/**
 * Show or hide the profile loading spinner/content.
 * @param {boolean} show - True to show loading, false to show content
 */
function showProfileLoading(show) {
    document.getElementById('profileLoading').style.display = show ? 'block' : 'none';
    document.getElementById('profileContent').style.display = show ? 'none' : 'block';
}

/**
 * Update the user's profile in Supabase and refresh the UI.
 * @param {Object} data - Profile fields to update
 */
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

/**
 * Log out the current user and redirect to login page.
 */
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

// --- REALTIME SUBSCRIPTIONS ---
/**
 * Subscribe to real-time admin messages (is_read = false) for the current user using Supabase Realtime.
 * Logs new admin messages to the console. Call this after user login/session is available.
 * @param {string} ngobrasUserId - The logged-in user's ID (receiver_id)
 * @returns {Promise<object|null>} The subscription object or null if error
 */
async function subscribeToNewAdminMessages(ngobrasUserId) {
    if (!window.supabaseClient) {
        console.error('Supabase client is not initialized!');
        return null;
    }
    try {
        const channel = window.supabaseClient
            .channel('admin-messages-channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${ngobrasUserId},is_read=eq.false,chat_type=eq.admin`,
                },
                (payload) => {
                    const { content, sender_id } = payload.new;
                    console.log(`[NEW MESSAGE] (Admin ID: ${sender_id}): "${content}"`);
                    // Optionally, trigger UI notification or update chat list here
                }
            )
            .subscribe();
        return channel;
    } catch (error) {
        console.error('Error subscribing to admin messages:', error);
        return null;
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', async function() {
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

    // Subscribe to real-time admin messages after user is authenticated
    const userProfileStr = localStorage.getItem('ngobras_user_profile');
    const userProfile = userProfileStr ? JSON.parse(userProfileStr) : null;
    if (userProfile && userProfile.id && window.supabaseClient) {
        subscribeToNewAdminMessages(userProfile.id);
    }
});

/**
 * DOMContentLoaded: Duplicate listener for initialization (can be merged with above).
 */
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

// --- GREETING SPHERE ANIMATION ---
/**
 * Show the animated greeting sphere for the AI assistant if no chat history exists.
 * @param {string} assistantName - Name of the AI assistant
 */
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

/**
 * Hide the greeting sphere animation.
 */
function hideGreetingSphere() {
    const greetingContainer = document.getElementById('greeting-sphere');
    if (greetingContainer) {
        greetingContainer.style.display = 'none';
    }
    // Remove anime.js animations
    anime.remove('#greetingSphereCircle');
    anime.remove('#greetingSphereSVG');
}

// --- GREETING SPHERE HOOKS ---
/**
 * Patch openChat, sendMessage, and loadAIMessages to show/hide greeting sphere as needed
 */
const originalOpenChat = window.openChat;
window.openChat = async function(type, name, assistantId) {
    // Hide greeting sphere if visible
    hideGreetingSphere();
    // Call original function
    return originalOpenChat.apply(this, arguments);
};

const originalSendMessage = window.sendMessage;
window.sendMessage = async function() {
    // Hide greeting sphere if visible
    hideGreetingSphere();
    // Call original function
    return originalSendMessage.apply(this, arguments);
};

const originalLoadAIMessages = window.loadAIMessages;
window.loadAIMessages = function(assistantName) {
    // Hide greeting sphere if visible
    hideGreetingSphere();
    // Call original function
    return originalLoadAIMessages.apply(this, arguments);
};

// --- AUTH MODAL ---
/**
 * Show the authentication modal (login required).
 */
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

/**
 * Animate the greeting text with a typing effect.
 * @param {string} text - The greeting message
 */
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

// --- GREETING SPHERE EYE CONFIG ---
const GREETING_EYE_WIDTH = 11;      // px
const GREETING_EYE_HEIGHT = 19;    // px
const GREETING_EYE_RADIUS = 4.5;   // px (corner sharpness, 0 = sharp, half width = fully round)

/**
 * Generate SVG markup for a mini animated sphere avatar (used in chat bubbles).
 * @param {string} id - Unique DOM id for the SVG
 * @param {string} extraClass - Additional CSS classes
 * @param {boolean} monochrome - Use grayscale gradient if true
 * @returns {string} SVG markup
 */
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

/**
 * Animate the mini sphere avatar (pulse and blink effects).
 * @param {string} id - The DOM id of the SVG
 */
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

// === GREETING SPHERE EYE FOLLOW ANIMATION ===
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

/**
 * Animate the chat page opening with a transition effect.
 * @param {Function} callback - Called after animation completes
 */
function animateChatPageOpen(callback) {
    // Find the chat room container
    const chatPage = document.getElementById('chat-page');
    if (!chatPage) {
        callback();
        return;
    }
    const chatRoom = chatPage.querySelector('.chat-room');
    if (!chatRoom) {
        callback();
        return;
    }

    // Prepare for animation
    chatRoom.classList.add('chat-room-animate-open');
    chatPage.style.display = 'block';
    chatPage.classList.add('active');

    // Hide scroll on body during animation
    document.body.style.overflow = 'hidden';

    // After animation, remove the class and restore normal state
    setTimeout(() => {
        chatRoom.classList.remove('chat-room-animate-open');
        chatPage.style.display = '';
        document.body.style.overflow = '';
        if (typeof callback === 'function') callback();
    }, 1000);
}

/**
 * Go to the last opened chat (if available), with animation.
 */
function goToLastChat() {
    const lastChat = localStorage.getItem('ngobras_last_chat');
    if (lastChat) {
        try {
            const { type, name } = JSON.parse(lastChat);
            if (type && name) {
                animateChatPageOpen(() => openChat(type, name));
                return;
            }
        } catch (e) {}
    }
    showFastPopup("Chat terakhir tidak ditemukan.");
}

/**
 * Show a fast popup message in the center of the screen.
 * @param {string} message - The message to show
 */
function showFastPopup(message) {
    // Remove existing popup if any
    let popup = document.getElementById('fast-popup');
    if (popup) popup.remove();

    popup = document.createElement('div');
    popup.id = 'fast-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.background = 'rgba(59, 105, 151, 0.47)';
    popup.style.color = '#fff';
    popup.style.padding = '1.2rem 2.2rem';
    popup.style.borderRadius = '16px';
    popup.style.fontSize = '1.1rem';
    popup.style.fontWeight = '600';
    popup.style.zIndex = '9999';
    popup.style.boxShadow = '0 8px 32px rgba(44,62,80,0.18)';
    popup.style.textAlign = 'center';
    popup.textContent = message;

    document.body.appendChild(popup);

    setTimeout(() => {
        popup.style.transition = 'opacity 0.4s';
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 400);
    }, 1400);
}

// --- ACTION MENU (FILE/PHOTO UPLOAD) ---
/**
 * Toggle the action menu (file/photo upload options).
 */
function toggleActionMenu() {
    const menu = document.getElementById('action-menu');
    if (!menu) return;
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'flex';
        setTimeout(() => {
            document.addEventListener('mousedown', handleActionMenuOutsideClick);
        }, 10);
    } else {
        menu.style.display = 'none';
        document.removeEventListener('mousedown', handleActionMenuOutsideClick);
    }
}

/**
 * Handle click outside the action menu to close it.
 * @param {MouseEvent} e
 */
function handleActionMenuOutsideClick(e) {
    const menu = document.getElementById('action-menu');
    const btn = document.getElementById('actionMenuBtn');
    if (menu && !menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
        menu.style.display = 'none';
        document.removeEventListener('mousedown', handleActionMenuOutsideClick);
    }
}

/**
 * Trigger the file input for uploading a file.
 */
function triggerFileUpload() {
    document.getElementById('fileInput').click();
    toggleActionMenu();
}

/**
 * Handle file input change event for uploading images.
 * @param {Event} event
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        if (file.size > 4 * 1024 * 1024) { // 4MB limit
            showFastPopup('Ukuran gambar terlalu besar (maks 4MB).');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            showPhotoPreview(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    } else if (file) {
        showFastPopup(`File dipilih: ${file.name}`);
    }
}

/**
 * Show a preview of the selected photo before sending.
 * @param {string} dataUrl - The image data URL
 * @param {string} fileName - The file name (optional)
 */
function showPhotoPreview(dataUrl, fileName = '') {
    const container = document.getElementById('photo-preview-container');
    container.innerHTML = `
        <div style="position:relative;">
            <img src="${dataUrl}" alt="Preview" class="photo-preview-thumb">
            <button class="photo-preview-remove" onclick="removePhotoPreview()" title="Hapus foto">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.style.display = 'flex';
    // Optionally, store the image data for sending with the message
    window._ngobrasPhotoPreview = { dataUrl, fileName };
}

/**
 * Remove the photo preview from the UI.
 */
function removePhotoPreview() {
    const container = document.getElementById('photo-preview-container');
    container.innerHTML = '';
    container.style.display = 'none';
    window._ngobrasPhotoPreview = null;
}

/**
 * Trigger the camera/photo input for taking a photo (mobile/desktop).
 */
function triggerTakePhoto() {
    // For mobile, this will prompt camera; for desktop, will open file dialog
    const input = document.getElementById('fileInput');
    input.setAttribute('accept', 'image/*');
    input.setAttribute('capture', 'environment');
    input.click();
    toggleActionMenu();
}

// --- LOGOUT MODAL ---
/**
 * Show the logout confirmation modal.
 */
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