// ===== ADMIN CHATROOM: Load user info for chat top bar =====

// Helper: pastikan centralized Supabase client sudah tersedia
function ensureSupabaseClientAvailable() {
    console.log('[ChatroomAdmin] Checking if window.getSupabaseClient is available:', typeof window.getSupabaseClient);
    console.log('[ChatroomAdmin] window object keys:', Object.keys(window).filter(k => k.includes('supa')));
    
    if (typeof window.getSupabaseClient !== 'function') {
        const msg = '[ERROR] getSupabaseClient function not available. Make sure supabaseClient.js is loaded before chatroom_admin.js';
        console.error(msg);
        
        // Log all script elements to debug loading order
        const scripts = document.querySelectorAll('script');
        console.debug('[ChatroomAdmin] Loaded scripts:', Array.from(scripts).map(s => s.src || 'inline script'));
        
        showChatError(msg + '\nCek urutan <script> di HTML.');
        throw new Error(msg);
    }
    
    console.log('[ChatroomAdmin] getSupabaseClient function is available');
}

document.addEventListener('DOMContentLoaded', function() {
    // Helper: Get query parameter from URL
    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // DOM elements for user info
    const userNameEl = document.getElementById('chat-user-name');
    const userRoleEl = document.getElementById('chat-user-role');
    const userAvatarEl = document.getElementById('chat-user-avatar');

    // Error display helper
    function showProfileError(msg) {
        if (userNameEl) userNameEl.textContent = 'User Not Found';
        if (userRoleEl) userRoleEl.textContent = '';
        if (userAvatarEl) userAvatarEl.src = 'images/default-avatar.png';
        
        // Show error in floating container with improved styling
        let container = document.getElementById('chat-error-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'chat-error-container';
            container.className = 'error-toast';
            document.body.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="error-toast-content">
                <div class="error-toast-icon">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                </div>
                <div class="error-toast-message">
                    ${msg}
                    <div class="error-toast-details">
                        Troubleshooting: Pastikan server backend berjalan di <b>http://localhost:3000</b>
                        dan akses aplikasi melalui <b>http://localhost:3000/src/chatroom_admin.html</b>
                    </div>
                </div>
                <button id="close-error-btn" class="error-toast-close" aria-label="Close error message">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        container.classList.add('visible');
        
        document.getElementById('close-error-btn').onclick = () => {
            container.classList.remove('visible');
        };
        
        clearTimeout(container._timeout);
        container._timeout = setTimeout(() => {
            container.classList.remove('visible');
        }, 12000);
        
        console.error('[ChatroomAdmin] ' + msg);
    }

    // Fetch user profile from backend
    async function fetchUserProfile(userId) {
        try {
            const res = await fetch(`/api/profiles/${encodeURIComponent(userId)}`);
            if (!res.ok) throw new Error('User not found or server error');
            const profile = await res.json();
            return profile;
        } catch (err) {
            showProfileError('Failed to load user profile: ' + err.message + '<br><b>Network error?</b>');
            return null;
        }
    }

    // Main logic: load user info and update UI
    async function loadUserInfo() {
        const userId = getQueryParam('user_id');
        if (!userId) {
            showProfileError('No user_id in URL.');
            return;
        }
        const profile = await fetchUserProfile(userId);
        if (!profile) return;
        // Update DOM with user info
        if (userNameEl) userNameEl.textContent = profile.full_name || profile.username || profile.email || 'Unknown';
        if (userRoleEl) userRoleEl.textContent = profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'User';
        if (userAvatarEl) userAvatarEl.src = profile.avatar_url || 'images/default-avatar.png';
    }

    loadUserInfo();
});

// ===== ADMIN CHATROOM: Realtime messages between admin and user =====
document.addEventListener('DOMContentLoaded', function() {
    // Helper: Get query parameter from URL
    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // DOM elements for chat body
    const chatBody = document.getElementById('chat-body');
    let supabase = null;
    let subscription = null;
    let adminId = getQueryParam('admin_id');
    let userId = getQueryParam('user_id');

    // Render messages in chat UI with animations and improved styling
    function renderMessages(messages) {
        if (!chatBody) return;
        
        // Show loading state
        if (chatBody.querySelector('.chat-loading-indicator') === null) {
            chatBody.innerHTML = `
                <div class="chat-loading-indicator">
                    <div class="loading-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            `;
        }
        
        // Handle empty state
        if (!Array.isArray(messages) || messages.length === 0) {
            chatBody.innerHTML = `
                <div class="chat-empty-state">
                    <div class="empty-icon">
                        <i class="bi bi-chat-square-text"></i>
                    </div>
                    <p>No messages yet</p>
                    <span>Messages will appear here when the conversation starts</span>
                </div>
            `;
            return;
        }
        
        // Clear loading indicator
        chatBody.innerHTML = '';
        
        // Get adminId from URL (or session)
        const urlParams = new URLSearchParams(window.location.search);
        const adminId = urlParams.get('admin_id');
        
        // Group messages by date
        let currentDate = null;
        
        messages.forEach((msg, idx) => {
            // Defensive: check message structure
            if (!msg || !msg.sender_id || !msg.content || !msg.created_at) {
                // Error bubble for developer
                const errBubble = document.createElement('div');
                errBubble.className = 'chat-bubble received error-bubble';
                errBubble.innerHTML = '<b>Invalid message object</b><br>' + JSON.stringify(msg);
                chatBody.appendChild(errBubble);
                return;
            }
            
            // Add date separator if needed
            const msgDate = new Date(msg.created_at);
            const formattedDate = msgDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
            
            if (formattedDate !== currentDate) {
                currentDate = formattedDate;
                const dateSeparator = document.createElement('div');
                dateSeparator.className = 'date-separator';
                dateSeparator.textContent = formattedDate;
                chatBody.appendChild(dateSeparator);
            }
            
            // Determine if message was sent by admin (right) or user (left)
            const isSent = (msg.sender_id === adminId);
            
            // Create message container
            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble ' + (isSent ? 'sent' : 'received');
            bubble.setAttribute('role', 'listitem');
            bubble.setAttribute('aria-label', `${isSent ? 'You' : 'User'}: ${msg.content}`);
            
            // Add read status indicator for sent messages
            if (isSent) {
                const readStatus = document.createElement('span');
                readStatus.className = 'read-status';
                readStatus.innerHTML = msg.is_read
                    ? '<i class="bi bi-check2-all" aria-label="Read"></i>'
                    : '<i class="bi bi-check2" aria-label="Sent"></i>';
                bubble.appendChild(readStatus);
            }
            
            // Message content
            const text = document.createElement('span');
            text.className = 'bubble-text';
            text.textContent = msg.content;
            bubble.appendChild(text);
            
            // Timestamp
            const time = document.createElement('span');
            time.className = 'bubble-time';
            time.setAttribute('aria-label', `Sent at ${new Date(msg.created_at).toLocaleTimeString()}`);
            time.textContent = new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
            bubble.appendChild(time);
            // ===== CONTEXT MENU (ADMIN BUBBLE ONLY, DESKTOP) =====
            if (isSent) {
                let menuOpen = false;
                let lastMenu = null;
                // ====== MOBILE/LONG PRESS SUPPORT ======
                let touchTimer = null;
                let touchMoved = false;
                // Helper: show context menu (shared for desktop and mobile)
                function showContextMenu(e) {
                    try {
                        if (e) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        // Remove other menus
                        document.querySelectorAll('.bubble-context-menu').forEach(el => el.remove());
                        document.querySelectorAll('.chat-bubble.sent.active-menu').forEach(el => el.classList.remove('active-menu'));
                        bubble.classList.add('active-menu');
                        // Create menu
                        const menu = document.createElement('div');
                        menu.className = 'bubble-context-menu debug';
                        // Copy button
                        const btnCopy = document.createElement('button');
                        btnCopy.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
                        btnCopy.onclick = async function(ev) {
                            ev.stopPropagation();
                            try {
                                await navigator.clipboard.writeText(msg.content);
                                showCopiedPopup();
                            } catch (err) {
                                showChatError('Failed to copy: ' + err.message);
                                console.error('[BubbleMenu] Clipboard error:', err);
                            }
                            menu.remove();
                            bubble.classList.remove('active-menu');
                        };
                        menu.appendChild(btnCopy);
                        // Delete button (dummy)
                        const btnDelete = document.createElement('button');
                        btnDelete.innerHTML = '<i class="bi bi-trash"></i> Delete';
                        btnDelete.className = 'danger';
                        btnDelete.onclick = function(ev) {
                            ev.stopPropagation();
                            if (confirm('Delete this message? (Not implemented)')) {
                                showChatError('Delete not implemented. Connect to backend to enable.');
                            }
                            menu.remove();
                            bubble.classList.remove('active-menu');
                        };
                        menu.appendChild(btnDelete);
                        // Position menu
                        let left, top;
                        const bubbleRect = bubble.getBoundingClientRect();
                        // Desktop: use mouse position; Mobile: center above bubble
                        if (e && e.type === 'contextmenu') {
                            left = e.clientX;
                            top = e.clientY;
                        } else {
                            // Mobile: center above bubble
                            left = bubbleRect.left + bubbleRect.width / 2 - 70; // 140px menu width
                            top = bubbleRect.top - 10;
                            if (top < 10) top = bubbleRect.bottom + 10;
                        }
                        // Clamp to viewport
                        if (left < 0) left = 10;
                        if (left + 150 > window.innerWidth) left = window.innerWidth - 150;
                        if (top + 90 > window.innerHeight) top = window.innerHeight - 100;
                        if (top < 0) top = 10;
                        menu.style.left = left + 'px';
                        menu.style.top = top + 'px';
                        document.body.appendChild(menu);
                        menuOpen = true;
                        lastMenu = menu;
                        // Debug: check menu visibility
                        setTimeout(() => {
                            let visible = true;
                            let reason = '';
                            const rect = menu.getBoundingClientRect();
                            const style = window.getComputedStyle(menu);
                            // ====== MOBILE DEBUG: Warn if display:none still applied ======
                            if (style.display === 'none') {
                                visible = false;
                                reason += 'Menu has display:none from CSS. Check for media query or !important rule. ';
                            }
                            if (rect.width === 0 || rect.height === 0) {
                                visible = false;
                                reason += 'Menu has zero width/height. ';
                            }
                            if (style.visibility === 'hidden' || style.opacity === '0') {
                                visible = false;
                                reason += `Computed style: visibility=${style.visibility}, opacity=${style.opacity}. `;
                            }
                            if (!visible) {
                                menu.classList.add('debug-visible');
                                menu.classList.add('blink');
                                showChatError('[BubbleMenu] Context menu is NOT visible! ' + reason + '<br>' +
                                    `<b>Menu rect:</b> ${JSON.stringify(rect)}<br>` +
                                    `<b>Window:</b> ${window.innerWidth}x${window.innerHeight}<br>` +
                                    `<b>Computed style:</b> display=${style.display}, visibility=${style.visibility}, opacity=${style.opacity}` +
                                    '<br><b>Developer: Periksa CSS media query .bubble-context-menu pada mobile, pastikan TIDAK ada display:none !important.</b>'
                                );
                                console.error('[BubbleMenu] Context menu is NOT visible!', {rect, style, reason});
                            } else {
                                menu.classList.remove('debug-visible');
                                menu.classList.remove('blink');
                                console.log('[BubbleMenu] Menu is visible in DOM and UI. Rect:', rect, 'Style:', style);
                            }
                        }, 120);
                        // ======= CLOSE MENU ON OUTSIDE CLICK/TAP (DESKTOP & MOBILE) =======
                        function closeMenuHandler(ev) {
                            // Only close if menu is open and click/tap is outside menu
                            if (menuOpen && !menu.contains(ev.target)) {
                                menu.remove();
                                bubble.classList.remove('active-menu');
                                menuOpen = false;
                                lastMenu = null;
                                console.log('[BubbleMenu] Context menu closed by outside click/tap. Event:', ev.type);
                                document.removeEventListener('mousedown', closeMenuHandler, true);
                                document.removeEventListener('touchstart', closeMenuHandler, true);
                            }
                        }
                        // Use capture phase to ensure handler runs before other handlers
                        setTimeout(() => {
                            document.addEventListener('mousedown', closeMenuHandler, true);
                            document.addEventListener('touchstart', closeMenuHandler, true);
                        }, 50);
                        console.log('[BubbleMenu] Context menu shown for message:', msg, {left, top});
                    } catch (err) {
                        showChatError('Failed to show context menu: ' + err.message);
                        console.error('[BubbleMenu] Error:', err);
                    }
                }
                // Desktop: right click
                bubble.addEventListener('contextmenu', showContextMenu);
                // Mobile: long press (touch and hold 1.5s)
                bubble.addEventListener('touchstart', function(e) {
                    if (window.innerWidth > 600) return; // Only on mobile
                    touchMoved = false;
                    touchTimer = setTimeout(() => {
                        if (!touchMoved) showContextMenu(e);
                    }, 1500);
                });
                bubble.addEventListener('touchmove', function() {
                    touchMoved = true;
                    if (touchTimer) clearTimeout(touchTimer);
                });
                bubble.addEventListener('touchend', function() {
                    if (touchTimer) clearTimeout(touchTimer);
                });
            }
            chatBody.appendChild(bubble);
        });
        // Scroll ke bawah otomatis
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Show error in chat UI with improved styling and accessibility
    function showChatError(msg) {
        // Floating error container with improved styling
        let container = document.getElementById('chat-error-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'chat-error-container';
            container.className = 'error-toast';
            container.setAttribute('role', 'alert');
            container.setAttribute('aria-live', 'assertive');
            document.body.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="error-toast-content">
                <div class="error-toast-icon">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                </div>
                <div class="error-toast-message">
                    ${msg}
                    <div class="error-toast-details">
                        Troubleshooting: Pastikan server backend berjalan di <b>http://localhost:3000</b>
                        dan akses aplikasi melalui <b>http://localhost:3000/src/chatroom_admin.html</b>
                    </div>
                </div>
                <button id="close-error-btn" class="error-toast-close" aria-label="Close error message">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        container.classList.add('visible');
        
        document.getElementById('close-error-btn').onclick = () => {
            container.classList.remove('visible');
        };
        
        clearTimeout(container._timeout);
        container._timeout = setTimeout(() => {
            container.classList.remove('visible');
        }, 12000);
        
        // Also show in chat body for user with improved styling
        if (chatBody) {
            chatBody.innerHTML = `
                <div class="chat-error-state">
                    <div class="error-icon">
                        <i class="bi bi-exclamation-circle"></i>
                    </div>
                    <h3>Connection Error</h3>
                    <p>${msg}</p>
                    <button id="retry-connection" class="retry-button">
                        <i class="bi bi-arrow-clockwise"></i> Retry Connection
                    </button>
                </div>
            `;
            
            // Add retry functionality
            const retryBtn = document.getElementById('retry-connection');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    // Show loading state
                    chatBody.innerHTML = `
                        <div class="chat-loading-indicator">
                            <div class="loading-spinner"></div>
                            <p>Reconnecting...</p>
                        </div>
                    `;
                    
                    // Attempt to reconnect
                    setTimeout(() => {
                        fetchMessages();
                        subscribeToMessages();
                    }, 1000);
                });
            }
        }
        
        console.error('[ChatroomAdmin][Realtime] ' + msg);
    }

    // Helper: Get Supabase access token from localStorage (compatible with Supabase v2 and custom admin login)
    function getSupabaseAccessToken() {
        // Cek key Supabase SDK (sb-...-auth-token)
        const supaKey = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
        if (supaKey) {
            try {
                const session = JSON.parse(localStorage.getItem(supaKey));
                if (session && session.access_token) {
                    console.log('[ChatroomAdmin] Found Supabase SDK token:', supaKey);
                    return session.access_token;
                }
            } catch (e) {}
        }
        // Fallback: cek key 'access_token' (custom admin login)
        const raw = localStorage.getItem('access_token');
        if (raw) {
            console.log('[ChatroomAdmin] Found custom admin access_token');
            return raw;
        }
        return null;
    }

    // Fetch all messages between admin and user
    async function fetchMessages() {
        if (!adminId || !userId) {
            showChatError('Missing admin_id or user_id in URL.');
            return;
        }
        try {
            console.log('[ChatroomAdmin] Fetching messages for admin:', adminId, 'user:', userId);
            const token = getSupabaseAccessToken();
            if (!token) {
                showChatError('Supabase access token not found. Admin must be logged in.');
                console.error('[ChatroomAdmin] Supabase access token not found.');
                return;
            }
            const res = await fetch(`/api/messages/${encodeURIComponent(userId)}/${encodeURIComponent(adminId)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch messages');
            const messages = await res.json();
            if (!Array.isArray(messages) || messages.length === 0) {
                console.warn('[ChatroomAdmin] No messages found for this chat.');
            } else {
                console.log('[ChatroomAdmin] Messages fetched:', messages);
            }
            renderMessages(messages);
        } catch (err) {
            showChatError('Failed to load messages: ' + err.message);
        }
    }

    // Initialize Supabase client using centralized client
    async function initSupabase() {
        try {
            console.log('[ChatroomAdmin] Initializing Supabase client...');
            ensureSupabaseClientAvailable();
            
            // Get client from centralized module
            console.log('[ChatroomAdmin] Calling window.getSupabaseClient()...');
            supabase = await window.getSupabaseClient();
            
            console.log('[ChatroomAdmin] getSupabaseClient() returned:', supabase ? 'valid client' : 'null/undefined');
            
            if (!supabase) {
                console.error('[ChatroomAdmin] Failed to get Supabase client from centralized module');
                throw new Error('Failed to get Supabase client from centralized module');
            }
            
            // Check if supabase client has expected methods
            console.log('[ChatroomAdmin] Supabase client methods available:',
                Object.keys(supabase).filter(k => typeof supabase[k] === 'function'));
            
            console.log('[ChatroomAdmin] Supabase client initialized successfully');
            return true;
        } catch (err) {
            showChatError('Supabase init error: ' + err.message + '<br><b>Network error?</b>');
            console.error('[ChatroomAdmin][Supabase Init Error]', err);
            return false;
        }
    }

    // Update unread messages to read status
    async function updateUnreadMessages() {
        if (!supabase || !adminId || !userId) {
            console.error('[ChatroomAdmin] Cannot update message status: missing supabase client, adminId, or userId');
            return { success: false, error: 'Missing required data' };
        }

        try {
            console.log('[ChatroomAdmin] Updating unread messages to read status...');
            
            // Find messages where admin is the receiver and messages are unread
            // This means messages sent by the user to the admin
            const { data, error, count } = await supabase
                .from('messages')
                .update({ is_read: true })
                .match({
                    sender_id: userId,
                    receiver_id: adminId,
                    is_read: false
                });
            
            if (error) {
                console.error('[ChatroomAdmin] Error updating message read status:', error);
                return { success: false, error };
            }
            
            console.log(`[ChatroomAdmin] Successfully updated message read status. Affected rows:`, count);
            return { success: true, count };
        } catch (err) {
            console.error('[ChatroomAdmin] Exception updating message read status:', err);
            return { success: false, error: err };
        }
    }

    // Subscribe to messages table for realtime updates (Supabase v2 compatible)
    async function subscribeToMessages() {
        if (!supabase) {
            console.warn('[ChatroomAdmin] Supabase client not initialized, initializing now...');
            const initialized = await initSupabase();
            if (!initialized || !supabase) {
                console.error('[ChatroomAdmin] Failed to initialize Supabase, cannot subscribe to messages');
                return;
            }
        }
        
        console.log('[ChatroomAdmin] Supabase client before subscription:',
            supabase ? 'exists' : 'null/undefined',
            supabase ? `with methods: ${Object.keys(supabase).filter(m => typeof supabase[m] === 'function').join(', ')}` : '');
        
        if (!adminId || !userId) {
            console.error('[ChatroomAdmin] Missing adminId or userId, cannot subscribe to messages');
            return;
        }
        // Defensive: cek apakah supabase.channel tersedia (Supabase v2)
        if (typeof supabase.channel !== 'function') {
            showChatError('[Supabase] .channel() is not a function. Pastikan Supabase JS v2 sudah di-load sebelum script custom.');
            console.error('[ChatroomAdmin][Realtime] supabase.channel is not a function:', supabase);
            return;
        }
        // Unsubscribe previous if any
        if (subscription) {
            try {
                await supabase.removeChannel(subscription);
            } catch (err) {
                console.error('[ChatroomAdmin][Realtime] Failed to remove previous channel:', err);
            }
        }
        // Subscribe to ALL changes in messages table (filter in handler)
        subscription = supabase.channel('messages-realtime-admin')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
            }, payload => {
                // Log event for debugging
                console.log('[ChatroomAdmin][Realtime] Event received:', payload);
                // Only re-fetch if the message is relevant to this chat
                const msg = payload.new || payload.old;
                if (!msg) return;
                const relevant = (
                    (msg.sender_id === adminId && msg.receiver_id === userId) ||
                    (msg.sender_id === userId && msg.receiver_id === adminId)
                );
                if (relevant) {
                    console.log('[ChatroomAdmin][Realtime] Relevant event, re-fetching messages.');
                    fetchMessages();
                    
                    // If it's a new message from user to admin, mark it as read immediately
                    if (payload.eventType === 'INSERT' &&
                        msg.sender_id === userId &&
                        msg.receiver_id === adminId &&
                        msg.is_read === false) {
                        console.log('[ChatroomAdmin][Realtime] New unread message detected, updating read status...');
                        updateUnreadMessages();
                    }
                } else {
                    console.log('[ChatroomAdmin][Realtime] Irrelevant event, ignored.');
                }
            })
            .subscribe(); // No callback here!
        // Listen to channel status events (Supabase v2)
        if (typeof subscription.on === 'function') {
            subscription.on('status', ({status}) => {
                console.log('[ChatroomAdmin][Realtime] Channel status:', status);
                if (status === 'SUBSCRIBED') {
                    fetchMessages();
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    showChatError('Realtime subscription error. Falling back to manual refresh.');
                }
            });
            subscription.on('error', (err) => {
                showChatError('Realtime channel error: ' + (err && err.message ? err.message : err));
            });
        } else {
            console.warn('[ChatroomAdmin][Realtime] subscription.on is not a function.');
        }
    }

    // Main logic
    async function startRealtimeChat() {
        adminId = getQueryParam('admin_id');
        userId = getQueryParam('user_id');
        if (!adminId || !userId) {
            showChatError('Missing admin_id or user_id in URL.');
            return;
        }
        await initSupabase();
        await fetchMessages();
        
        // Auto-update unread messages to read status when admin opens the chatroom
        const updateResult = await updateUnreadMessages();
        if (!updateResult.success) {
            console.warn('[ChatroomAdmin] Failed to auto-update message read status:', updateResult.error);
            // Continue with chat functionality even if update fails
        } else {
            console.log('[ChatroomAdmin] Auto-updated message read status successfully');
        }
        
        await subscribeToMessages();
    }

    startRealtimeChat();

    // Update read status when window gains focus (for when user returns to tab)
    window.addEventListener('focus', async () => {
        if (supabase && adminId && userId) {
            console.log('[ChatroomAdmin] Window gained focus, updating message read status...');
            await updateUnreadMessages();
        }
    });

    // Cleanup on unload
    window.addEventListener('beforeunload', async () => {
        if (supabase && subscription) {
            await supabase.removeChannel(subscription);
        }
    });
});

// ===== ADMIN CHATROOM: Robust Back Button Navigation =====
document.addEventListener('DOMContentLoaded', function() {
    const backBtn = document.getElementById('chat-back-btn');
    if (!backBtn) {
        showChatError('[BackButton] Back button element not found in DOM. Check chatroom_admin.html structure.');
        return;
    }
    backBtn.addEventListener('click', function(e) {
        e.preventDefault();
        try {
            // Attempt navigation to admin.html
            window.location.href = 'admin.html#consultations';
        } catch (err) {
            showChatError('[BackButton] Failed to navigate to admin.html: ' + err.message + '<br><span style="font-size:0.95em;color:#b00;">Troubleshooting: Check if admin.html exists in /src and server is running at http://localhost:3000</span>');
            console.error('[BackButton] Navigation error:', err);
        }
    });
});

// ===== GLOBAL ERROR HANDLER FOR CHAT =====
function showChatError(msg) {
    let container = document.getElementById('chat-error-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'chat-error-container';
        container.className = 'error-toast';
        container.setAttribute('role', 'alert');
        container.setAttribute('aria-live', 'assertive');
        document.body.appendChild(container);
    }
    
    container.innerHTML = `
        <div class="error-toast-content">
            <div class="error-toast-icon">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div class="error-toast-message">
                ${msg}
            </div>
            <button id="close-error-btn" class="error-toast-close" aria-label="Close error message">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;
    
    container.classList.add('visible');
    
    document.getElementById('close-error-btn').onclick = () => {
        container.classList.remove('visible');
    };
    
    clearTimeout(container._timeout);
    container._timeout = setTimeout(() => {
        container.classList.remove('visible');
    }, 12000);
    
    console.error('[ChatroomAdmin][Error]', msg);
}

// ===== HANDLE CHAT INPUT & SEND MESSAGE =====
document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-input-bar');
    const chatInput = document.getElementById('input-message');
    const sendButton = document.querySelector('.input-send');
    const chatBody = document.getElementById('chat-body');
    
    // Helper: Get Supabase access token and adminId from session
    function getSupabaseSession() {
        const supaKey = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
        if (supaKey) {
            try {
                const session = JSON.parse(localStorage.getItem(supaKey));
                if (session && session.access_token && session.user && session.user.id) {
                    return { token: session.access_token, adminId: session.user.id };
                }
            } catch (e) {
                console.error('[ChatroomAdmin] Failed to parse Supabase session:', e);
            }
        }
        return { token: null, adminId: null };
    }
    
    if (!chatForm || !chatInput) return;
    
    // Add typing indicator functionality
    let typingTimeout;
    chatInput.addEventListener('input', function() {
        if (sendButton) {
            if (chatInput.value.trim()) {
                sendButton.classList.add('active');
            } else {
                sendButton.classList.remove('active');
            }
        }
        
        // Clear previous timeout
        clearTimeout(typingTimeout);
        
        // Set new timeout for typing indicator (could be implemented with WebSockets)
        typingTimeout = setTimeout(() => {
            // Code to stop typing indicator would go here
        }, 2000);
    });
    
    // Handle form submission with optimistic UI updates
    chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const content = chatInput.value.trim();
        if (!content) return;
        
        // Get userId from URL, adminId from Supabase session
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        const { token, adminId } = getSupabaseSession();
        
        if (!adminId || !userId || !token) {
            showChatError('Session error: Admin or user not found. Please re-login.');
            console.error('[ChatroomAdmin] Missing adminId, userId, or token:', { adminId, userId, token });
            return;
        }
        
        // Prepare message data
        const messageData = {
            sender_id: adminId,
            receiver_id: userId,
            content,
            chat_type: 'admin',
            created_at: new Date().toISOString(),
            is_read: false,
            id: 'temp-' + Date.now() // Temporary ID for optimistic UI
        };
        
        // Clear input immediately for better UX
        chatInput.value = '';
        if (sendButton) sendButton.classList.remove('active');
        
        // Add optimistic message to UI
        addOptimisticMessage(messageData);
        
        // Prepare payload for API
        const payload = {
            sender_id: adminId,
            receiver_id: userId,
            content,
            chat_type: 'admin'
        };
        
        // Disable input/button while sending
        chatInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
        
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
                // Handle error
                let errMsg = 'Failed to send message: ' + res.status;
                let backendErr = null;
                try {
                    backendErr = await res.json();
                    errMsg += ' - ' + (backendErr.error || backendErr.details || JSON.stringify(backendErr));
                } catch {}
                
                // Mark optimistic message as failed
                markMessageAsFailed(messageData.id);
                
                showChatError(errMsg);
                console.error('[ChatroomAdmin] Send message error:', errMsg, {payload, backendErr});
            } else {
                // Message sent successfully
                markMessageAsDelivered(messageData.id);
            }
        } catch (err) {
            // Network error
            markMessageAsFailed(messageData.id);
            showChatError('Network error: ' + err.message);
            console.error('[ChatroomAdmin] Send message exception:', err);
        } finally {
            chatInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            chatInput.focus();
        }
    });
    
    // Helper: Add optimistic message to UI
    function addOptimisticMessage(messageData) {
        if (!chatBody) return;
        
        // Create message bubble with pending status
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble sent optimistic';
        bubble.id = `msg-${messageData.id}`;
        bubble.setAttribute('role', 'listitem');
        bubble.setAttribute('aria-label', `You: ${messageData.content}`);
        
        // Add sending indicator
        const status = document.createElement('span');
        status.className = 'read-status pending';
        status.innerHTML = '<i class="bi bi-clock" aria-label="Sending"></i>';
        bubble.appendChild(status);
        
        // Message content
        const text = document.createElement('span');
        text.className = 'bubble-text';
        text.textContent = messageData.content;
        bubble.appendChild(text);
        
        // Timestamp
        const time = document.createElement('span');
        time.className = 'bubble-time';
        time.textContent = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        bubble.appendChild(time);
        
        // Add to chat body with animation
        chatBody.appendChild(bubble);
        
        // Scroll to bottom
        setTimeout(() => {
            chatBody.scrollTop = chatBody.scrollHeight;
            // Add visible class for animation
            bubble.classList.add('visible');
        }, 10);
    }
    
    // Helper: Mark optimistic message as delivered
    function markMessageAsDelivered(tempId) {
        const bubble = document.getElementById(`msg-${tempId}`);
        if (!bubble) return;
        
        const status = bubble.querySelector('.read-status');
        if (status) {
            status.classList.remove('pending');
            status.classList.add('sent');
            status.innerHTML = '<i class="bi bi-check2" aria-label="Sent"></i>';
        }
    }
    
    // Helper: Mark optimistic message as failed
    function markMessageAsFailed(tempId) {
        const bubble = document.getElementById(`msg-${tempId}`);
        if (!bubble) return;
        
        bubble.classList.add('failed');
        
        const status = bubble.querySelector('.read-status');
        if (status) {
            status.classList.remove('pending');
            status.classList.add('failed');
            status.innerHTML = '<i class="bi bi-exclamation-circle" aria-label="Failed to send"></i>';
        }
        
        // Add retry button
        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry-message';
        retryBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Retry';
        retryBtn.setAttribute('aria-label', 'Retry sending message');
        bubble.appendChild(retryBtn);
        
        // Add retry functionality
        retryBtn.addEventListener('click', () => {
            // Remove failed status and retry button
            bubble.classList.remove('failed');
            retryBtn.remove();
            
            // Update status back to pending
            if (status) {
                status.classList.remove('failed');
                status.classList.add('pending');
                status.innerHTML = '<i class="bi bi-clock" aria-label="Sending"></i>';
            }
            
            // Get message content and retry sending
            const content = bubble.querySelector('.bubble-text').textContent;
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('user_id');
            const { token, adminId } = getSupabaseSession();
            
            if (!adminId || !userId || !token) {
                showChatError('Session error: Admin or user not found. Please re-login.');
                markMessageAsFailed(tempId);
                return;
            }
            
            // Prepare payload
            const payload = {
                sender_id: adminId,
                receiver_id: userId,
                content,
                chat_type: 'admin'
            };
            
            // Send message
            fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to send: ${res.status}`);
                }
                markMessageAsDelivered(tempId);
            })
            .catch(err => {
                console.error('[ChatroomAdmin] Retry send failed:', err);
                markMessageAsFailed(tempId);
                showChatError('Failed to resend message: ' + err.message);
            });
        });
    }
});

// ===== FAST POPUP FOR COPY CHAT =====
function showCopiedPopup(msg = 'Chat disalin ke clipboard') {
    let popup = document.getElementById('chat-copied-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'chat-copied-popup';
        document.body.appendChild(popup);
    }
    popup.textContent = msg;
    popup.classList.add('visible');
    // Remove after 2s
    setTimeout(() => {
        popup.classList.remove('visible');
    }, 2000);
}

// ===== END ADMIN CHATROOM REALTIME =====
