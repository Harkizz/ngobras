// JavaScript for ngobras.html page
let currentChatType = 'admin';
        let currentChatName = '';
        let chatHistory = {}; // Store chat messages for each assistant/admin

        // Use localStorage for chat history
function getChatHistory(chatId) {
    const key = `ngobras_chat_history_${chatId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

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

function renderProgressiveText(element, text, speed = 20) {
    let index = 0;
    element.textContent = '';
    
    function addChar() {
        if (index < text.length) {
            const char = document.createElement('span');
            char.className = 'char';
            char.textContent = text[index];
            element.appendChild(char);
            index++;
            setTimeout(addChar, speed);
        }
    }
    
    addChar();
}

        // Navigation
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

        // Open chat
        function openChat(type, name) {
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
        }

        // Go back to home
        function goBack() {
            const bottomNav = document.querySelector('.bottom-nav');
            const topNavbar = document.querySelector('.top-navbar');
            
            // Show bottom nav and top navbar when going back
            if (bottomNav) bottomNav.style.display = 'flex';
            if (topNavbar) topNavbar.style.display = 'flex';
            
            showPage('home');
        }

        // Switch chat type
        function switchToAI() {
            currentChatType = 'ai';
            
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
            
            // Load AI messages
            loadAIMessages();
        }

        function switchToAdmin() {
            currentChatType = 'admin';
            
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
            
            // Load admin messages
            loadAdminMessages();
        }

        // Load different message sets
        function loadAIMessages(assistantName) {
            const messagesList = document.getElementById('messages-list');
            const chatId = `ai_${assistantName}`;
            const history = getChatHistory(chatId);

            if (messagesList) {
                if (history.length > 0) {
                    messagesList.innerHTML = history.map(msg => {
                        if (msg.isSent) {
                            return `
                                <div class="message sent fade-in">
                                    <div>
                                        <div class="message-bubble">${msg.text}</div>
                                        <div class="message-time">${msg.timestamp}</div>
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="message received ai fade-in">
                                    <div class="message-avatar ai">
                                        <i class="fas fa-robot"></i>
                                    </div>
                                    <div>
                                        <div class="message-bubble">${msg.text}</div>
                                        <div class="message-time">${msg.timestamp}</div>
                                    </div>
                                </div>
                            `;
                        }
                    }).join('');
                } else {
                    messagesList.innerHTML = '';
                }
            }
            scrollToBottom();
        }

        function loadAdminMessages(adminName) {
            const messagesList = document.getElementById('messages-list');
            const chatId = `admin_${adminName}`;
            const history = getChatHistory(chatId);

            if (messagesList) {
                if (history.length > 0) {
                    messagesList.innerHTML = history.map(msg => {
                        if (msg.isSent) {
                            return `
                                <div class="message sent fade-in">
                                    <div>
                                        <div class="message-bubble">${msg.text}</div>
                                        <div class="message-time">${msg.timestamp}</div>
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="message received fade-in">
                                    <div class="message-avatar admin">
                                        <i class="fas fa-user-md"></i>
                                    </div>
                                    <div>
                                        <div class="message-bubble">${msg.text}</div>
                                        <div class="message-time">${msg.timestamp}</div>
                                    </div>
                                </div>
                            `;
                        }
                    }).join('');
                } else {
                    // First time chat - show welcome message
                    const welcomeMessage = `Halo! Saya ${adminName}. Senang bertemu dengan Anda. Bagaimana perasaan Anda hari ini?`;
                    messagesList.innerHTML = `
                        <div class="message received fade-in">
                            <div class="message-avatar admin">
                                <i class="fas fa-user-md"></i>
                            </div>
                            <div>
                                <div class="message-bubble">${welcomeMessage}</div>
                                <div class="message-time">${new Date().toLocaleTimeString('id-ID', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })}</div>
                            </div>
                        </div>
                    `;
                    saveChatMessage(chatId, welcomeMessage, false);
                }
            }
            scrollToBottom();
        }

        // Send message
        async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (message === '') return;

    const chatId = currentChatType === 'ai' ? `ai_${currentChatName}` : `admin_${currentChatName}`;

    // Add user message
    addMessage(message, true);
    saveChatMessage(chatId, message, true);
    input.value = '';

    if (currentChatType === 'ai') {
        try {
            showTypingIndicator();

            // Get current AI assistant info
            const assistantsResponse = await fetch('/api/ai-assistants');
            if (!assistantsResponse.ok) {
                throw new Error('Failed to fetch AI assistants');
            }
            const assistants = await assistantsResponse.json();
            const currentAssistant = assistants.find(a => a.name === currentChatName);

            if (!currentAssistant) {
                throw new Error(`AI Assistant "${currentChatName}" not found`);
            }

            // Get memory_max and last N messages from localStorage
            const memoryMax = Number(currentAssistant.memory_max) || 10;
            const history = getChatHistory(chatId);
            // Get last N pairs (user+AI), so 2N messages
            const memoryMessages = history.slice(-memoryMax * 2).map(msg => ({
                role: msg.isSent ? 'user' : 'assistant',
                content: msg.text
            }));

            // Add the latest user message
            memoryMessages.push({ role: 'user', content: message });

            // Send to backend
            const chatResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    assistant_id: currentAssistant.id,
                    memory: memoryMessages // <-- send memory
                })
            });

            if (!chatResponse.ok) {
                const errorData = await chatResponse.json();
                throw new Error(errorData.error || 'Failed to get AI response');
            }

            const data = await chatResponse.json();
            hideTypingIndicator();
            addMessage(data.reply, false);
            saveChatMessage(chatId, data.reply, false);

        } catch (error) {
            console.error('AI response error:', error);
            hideTypingIndicator();
            const errorMessage = 'Sorry, I encountered an error. Please try again later.';
            addMessage(errorMessage, false);
            saveChatMessage(chatId, errorMessage, false);
        }
    } else {
        // Handle admin chat
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            const response = addAdminResponse(message);
            saveChatMessage(chatId, response, false);
        }, 1000);
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
        const messageClass = currentChatType === 'ai' ? 'message received ai fade-in' : 'message received fade-in';
        const iconClass = currentChatType === 'ai' ? 'fas fa-robot' : 'fas fa-user-md';
        
        messageDiv.className = messageClass;
        messageDiv.innerHTML = `
            <div class="message-avatar ${avatarClass}">
                <i class="${iconClass}"></i>
            </div>
            <div>
                <div class="message-bubble">
                    <div class="message-text-animated"></div>
                </div>
                <div class="message-time">${currentTime}</div>
            </div>
        `;
        messagesList.appendChild(messageDiv);
        
        // Progressive rendering for AI/admin responses
        const textElement = messageDiv.querySelector('.message-text-animated');
        renderProgressiveText(textElement, text);
    }
    
    scrollToBottom();
}

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

        // Typing indicator
        function showTypingIndicator() {
    let indicator = document.getElementById('typing-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'typing-indicator';
    }
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

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator && indicator.parentNode) {
        indicator.style.display = 'none';
        indicator.parentNode.removeChild(indicator);
    }
}

        // Handle enter key
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }        // Utility function to safely get DOM elements
        function getElement(id) {
            const element = document.getElementById(id);
            if (!element) {
                console.debug(`Element with id '${id}' not found - this is expected on non-chat pages`);
                return null;
            }
            return element;
        }

        // Scroll to bottom
        function scrollToBottom() {
            const messagesContainer = getElement('chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }

        // Emoji toggle
        function toggleEmoji() {
            const input = getElement('messageInput');
            if (input) {
                // Simple emoji implementation
                const emojis = ['😊', '😢', '😟', '😌', '🤗', '💪', '🙏', '❤️'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                input.value += randomEmoji;
                input.focus();
            }
        }

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

        // Supabase
        let supabaseClient;

        // Initialize Supabase
        async function initializeSupabase() {
            try {
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
                console.error('Supabase initialization error:', error);
                showAlert('Failed to load profile', 'danger');
            }
        }

        // Load user profile
        async function loadUserProfile(userId) {
            try {
                showProfileLoading(true);
                
                // Fetch profile data
                const { data: profile, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();
                    
                if (error) throw error;
                
                // Update UI with profile data
                updateProfileUI(profile);
                
                // Fetch chat statistics
                const { data: chatStats, error: statsError } = await supabaseClient
                    .from('messages')
                    .select('created_at')
                    .eq('sender_id', userId);
                    
                if (statsError) throw statsError;
                
                updateProfileStats(chatStats);
                
            } catch (error) {
                console.error('Error loading profile:', error);
                showAlert('Failed to load profile data', 'danger');
            } finally {
                showProfileLoading(false);
            }
        }

        // Update profile UI
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

        // Update profile statistics
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
    if (!greetingContainer || !greetingText || !svg || !circle) return;

    // Set greeting text
    greetingText.textContent = `Halo! Saya ${assistantName}. Saya siap membantu Anda 24/7.`;

    // Reset SVG
    circle.setAttribute('r', 40);
    circle.setAttribute('fill', '#6C63FF');
    circle.setAttribute('opacity', 0.8);

    greetingContainer.style.display = 'flex';

    // Animate the sphere: pulse, color shift, and floating
    anime({
        targets: '#greetingSphereCircle',
        r: [
            { value: 40, duration: 0 },
            { value: 48, duration: 700, easing: 'easeInOutSine' },
            { value: 40, duration: 700, easing: 'easeInOutSine' }
        ],
        fill: [
            { value: '#6C63FF', duration: 0 },
            { value: '#4a90e2', duration: 700, easing: 'easeInOutSine' },
            { value: '#6C63FF', duration: 700, easing: 'easeInOutSine' }
        ],
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutSine'
    });

    anime({
        targets: '#greetingSphereSVG',
        translateY: [
            { value: 0, duration: 0 },
            { value: -12, duration: 900, easing: 'easeInOutSine' },
            { value: 0, duration: 900, easing: 'easeInOutSine' }
        ],
        loop: true,
        direction: 'alternate',
        easing: 'easeInOutSine'
    });
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