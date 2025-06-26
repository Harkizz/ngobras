// Open chat
async function openChat(type, name, assistantId) {
    currentChatType = type;
    currentChatName = name;
    if (type === 'ai') {
        loadAIMessages(name);
    } else {
        // ADMIN CHAT: fetch dari Supabase, simpan ke localStorage, lalu render dari localStorage
        let adminId = null;
        try {
            const res = await fetch('/api/admins');
            const admins = await res.json();
            const found = admins.find(a => (a.full_name || a.username) === name);
            if (found) {
                adminId = found.id;
            }
        } catch (e) {
            console.error('Error fetching admins:', e);
        }
        window.currentAdminId = adminId;
        if (adminId) {
            localStorage.setItem('ngobras_current_admin_id', adminId);
            const userProfileStr = localStorage.getItem('ngobras_user_profile');
            const userId = userProfileStr ? JSON.parse(userProfileStr).id : null;
            if (userId) {
                await loadAdminMessagesFromDB(userId, adminId);
                renderAdminMessagesFromLocalStorage();
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
                            renderAdminMessagesFromLocalStorage();
        } else {
            avatar.className = 'chat-avatar admin';
            avatar.innerHTML = '<i class="fas fa-user-md"></i>';
            status.textContent = 'Online';
                           renderAdminMessagesFromLocalStorage();
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

// Send message (restore AI memory logic)
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

// Add message to chat
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

// Update goToLastChat to use the animation
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