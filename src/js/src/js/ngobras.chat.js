// Open chat
import { currentChatType, currentChatName, getChatHistory, saveChatMessage, loadAIMessages, formatAIResponse } from './ngobras.js';
import { showPage } from './ngobras.navigation.js';
import { scrollToBottom } from './ngobras.utils.js';

export async function openChat(type, name, assistantId) {
    currentChatType = type;
    currentChatName = name;
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
            // Ambil userId dan adminId
            const userProfileStr = localStorage.getItem('ngobras_user_profile');
            const userId = userProfileStr ? JSON.parse(userProfileStr).id : null;
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
            if (userId && adminId) {
                localStorage.setItem('ngobras_current_admin_id', adminId);
                await loadAdminMessagesFromDB(userId, adminId);
            }
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

export function switchToAdmin() {
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

// Send message (restore AI memory logic)
export async function sendMessage() {
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

// Add message to chat
export function addMessage(text, isSent = false) {
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

// Update goToLastChat to use the animation
export function goToLastChat() {
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

let chatSubscription = null;

export async function subscribeToAdminMessages(userId, adminId) {
    if (!window.supabaseClient) {
        const resp = await fetch('/api/supabase-config');
        const config = await resp.json();
        if (window.supabase && config.url && config.anonKey) {
            window.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
        } else {
            throw new Error('Supabase client not initialized');
        }
    }
    if (chatSubscription) {
        await chatSubscription.unsubscribe();
        chatSubscription = null;
    }
    console.log('[Realtime] Subscribing to messages for user:', userId, 'admin:', adminId);
    chatSubscription = window.supabaseClient
        .channel('messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${userId},sender_id=eq.${adminId}`
        }, async payload => {
            console.log('[Realtime][payload]', payload);
            // Simpan pesan baru ke localStorage dua arah
            const key1 = `ngobras_admin_chat_${userId}_${adminId}`;
            const key2 = `ngobras_admin_chat_${adminId}_${userId}`;
            let messages1 = JSON.parse(localStorage.getItem(key1) || '[]');
            let messages2 = JSON.parse(localStorage.getItem(key2) || '[]');
            messages1.push(payload.new);
            messages2.push(payload.new);
            localStorage.setItem(key1, JSON.stringify(messages1));
            localStorage.setItem(key2, JSON.stringify(messages2));
            // Render pesan baru jika chat aktif
            if (window.currentAdminId === adminId) {
                const isSent = payload.new.sender_id === userId;
                addMessage(payload.new.content, isSent);
                scrollToBottom();
            } else {
                // Logging badge logic
                console.log('[Realtime][badge-check] is_read:', payload.new.is_read, 'adminId:', adminId);
                const badge = document.querySelector(`.unread-count[data-admin-id='${adminId}']`);
                console.log('[Realtime][badge-element]', badge);
                if (payload.new.is_read === false && badge) {
                    let count = parseInt(badge.textContent) || 0;
                    count++;
                    badge.textContent = count;
                    badge.style.display = 'inline-block';
                } else if (!badge) {
                    console.warn(`[Realtime][badge] Element not found for adminId: ${adminId}`);
                }
            }

            // Logging pesan baru
            let senderName = payload.new.sender_id;
            try {
                const res = await fetch(`/api/profiles/${payload.new.sender_id}`);
                if (res.ok) {
                    const profile = await res.json();
                    senderName = profile.full_name || profile.username || profile.email || senderName;
                }
            } catch {}
            console.log(`[new message] (${senderName}) : "${payload.new.content}"`);
        })
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${userId},receiver_id=eq.${adminId}`
        }, async payload => {
            // Simpan pesan baru ke localStorage dua arah
            const key1 = `ngobras_admin_chat_${userId}_${adminId}`;
            const key2 = `ngobras_admin_chat_${adminId}_${userId}`;
            let messages1 = JSON.parse(localStorage.getItem(key1) || '[]');
            let messages2 = JSON.parse(localStorage.getItem(key2) || '[]');
            messages1.push(payload.new);
            messages2.push(payload.new);
            localStorage.setItem(key1, JSON.stringify(messages1));
            localStorage.setItem(key2, JSON.stringify(messages2));
            if (window.currentAdminId === adminId) {
                const isSent = payload.new.sender_id === userId;
                addMessage(payload.new.content, isSent);
                scrollToBottom();
            } else {
                // Logging pesan baru dari user sendiri (opsional, bisa dihapus jika hanya ingin log pesan masuk)
                let senderName = payload.new.sender_id;
                try {
                    const res = await fetch(`/api/profiles/${payload.new.sender_id}`);
                    if (res.ok) {
                        const profile = await res.json();
                        senderName = profile.full_name || profile.username || profile.email || senderName;
                    }
                } catch {}
                console.log(`[new message] (${senderName}) : "${payload.new.content}"`);
            }
        })
        .subscribe(status => {
            if (status === 'SUBSCRIBED') {
                console.log('[Realtime] Subscription success');
            } else {
                console.warn('[Realtime] Subscription status:', status);
            }
        });
}

// Patch openChat agar reset badge unread saat user buka chat admin
const _originalOpenChat = openChat;
openChat = async function(type, name, assistantId) {
    await _originalOpenChat(type, name, assistantId);
    if (type === 'admin') {
        // Cari adminId dari name
        let adminId = null;
        try {
            const res = await fetch('/api/admins');
            const admins = await res.json();
            const found = admins.find(a => (a.full_name || a.username) === name);
            if (found) adminId = found.id;
        } catch {}
        if (adminId) {
            const badge = document.querySelector(`.unread-count[data-admin-id='${adminId}']`);
            if (badge) {
                badge.textContent = 0;
                badge.style.display = 'none';
            }
        }
    }
};

// Load messages for admin chat from Supabase
export async function loadAdminMessagesFromDB(userId, adminId) {
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

// Load Admins
export async function loadAdminList() {
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