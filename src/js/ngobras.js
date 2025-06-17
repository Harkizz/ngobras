// JavaScript for ngobras.html page
let currentChatType = 'admin';
        let currentChatName = '';

        // Navigation
        function showPage(page) {
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
           // Add active class to clicked nav item
            event.target.closest('.nav-item').classList.add('active');
            
            // Hide all pages
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active');
            });
            
            // Show selected page
            if (page === 'home') {
                document.getElementById('home-page').classList.add('active');
            } else if (page === 'chat') {
                document.getElementById('chat-page').classList.add('active');
            } else if (page === 'history') {
                document.getElementById('history-page').classList.add('active');
            } else if (page === 'profile') {
                document.getElementById('profile-page').classList.add('active');
            }
        }

        // Open chat
        function openChat(type, name) {
            currentChatType = type;
            currentChatName = name;
            
            // Update chat header
            document.getElementById('current-chat-name').textContent = name;
            
            const avatar = document.getElementById('current-chat-avatar');
            const status = document.getElementById('current-chat-status');
            
            if (type === 'ai') {
                avatar.className = 'chat-avatar ai';
                avatar.innerHTML = '<i class="fas fa-robot"></i>';
                status.textContent = 'AI Assistant - Online';
                
                // Update switch buttons
                document.querySelector('.switch-btn.ai').classList.add('active');
                document.querySelector('.switch-btn.admin').classList.remove('active');
            } else {
                avatar.className = 'chat-avatar admin';
                avatar.innerHTML = '<i class="fas fa-user-md"></i>';
                status.textContent = 'Online';
                
                // Update switch buttons
                document.querySelector('.switch-btn.admin').classList.add('active');
                document.querySelector('.switch-btn.ai').classList.remove('active');
            }
            
            // Switch to chat page
            showPage('chat');
            
            // Clear unread indicators
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('unread');
            });
            document.querySelectorAll('.unread-count').forEach(badge => {
                badge.style.display = 'none';
            });
        }

        // Go back to home
        function goBack() {
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
        function loadAIMessages() {
            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.innerHTML = `
                <div class="message received ai">
                    <div class="message-avatar ai">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div>
                        <div class="message-bubble">
                            Halo! Saya NGOBRAS AI Assistant. Saya siap membantu Anda 24/7. Apa yang bisa saya bantu hari ini?
                        </div>
                        <div class="message-time">09:15</div>
                    </div>
                </div>
                
                <div class="message sent">
                    <div>
                        <div class="message-bubble">
                            Halo, saya ingin tahu tentang teknik relaksasi untuk mengatasi stress
                        </div>
                        <div class="message-time">09:17</div>
                    </div>
                </div>
                
                <div class="message received ai">
                    <div class="message-avatar ai">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div>
                        <div class="message-bubble">
                            Tentu! Berikut beberapa teknik relaksasi yang efektif:<br><br>
                            1. <strong>Pernapasan dalam:</strong> Tarik napas selama 4 detik, tahan 4 detik, buang napas 6 detik<br>
                            2. <strong>Progressive muscle relaxation:</strong> Kencangkan dan lepaskan otot secara bertahap<br>
                            3. <strong>Mindfulness:</strong> Fokus pada momen saat ini tanpa menghakimi<br><br>
                            Mana yang ingin Anda coba terlebih dahulu?
                        </div>
                        <div class="message-time">09:18</div>
                    </div>
                </div>
            `;
            scrollToBottom();
        }

        function loadAdminMessages() {
            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.innerHTML = `
                <div class="message received">
                    <div class="message-avatar admin">
                        <i class="fas fa-user-md"></i>
                    </div>
                    <div>
                        <div class="message-bubble">
                            Halo! Saya Dr. Sarah. Senang bertemu dengan Anda. Bagaimana perasaan Anda hari ini?
                        </div>
                        <div class="message-time">10:25</div>
                    </div>
                </div>

                <div class="message sent">
                    <div>
                        <div class="message-bubble">
                            Halo dok, saya merasa sedikit cemas belakangan ini dan sulit tidur
                        </div>
                        <div class="message-time">10:27</div>
                    </div>
                </div>

                <div class="message received">
                    <div class="message-avatar admin">
                        <i class="fas fa-user-md"></i>
                    </div>
                    <div>
                        <div class="message-bubble">
                            Saya memahami perasaan Anda. Kecemasan dan gangguan tidur memang sering terjadi bersamaan. Bisakah Anda ceritakan lebih detail tentang apa yang membuat Anda merasa cemas?
                        </div>
                        <div class="message-time">10:30</div>
                    </div>
                </div>
            `;
            scrollToBottom();
        }

        // Send message
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (message === '') return;
            
            // Add user message
            addMessage(message, true);
            input.value = '';
            
            // Show typing indicator
            showTypingIndicator();
            
            // Simulate response delay
            setTimeout(() => {
                hideTypingIndicator();
                
                if (currentChatType === 'ai') {
                    addAIResponse(message);
                } else {
                    addAdminResponse(message);
                }
            }, Math.random() * 2000 + 1000);
        }

        // Add message to chat
        function addMessage(text, isSent = false) {
            const messagesContainer = document.getElementById('chat-messages');
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
                        <div class="message-bubble">${text}</div>
                        <div class="message-time">${currentTime}</div>
                    </div>
                `;
            }
            
            messagesContainer.appendChild(messageDiv);
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
            const indicator = document.getElementById('typing-indicator');
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
            scrollToBottom();
        }

        function hideTypingIndicator() {
            document.getElementById('typing-indicator').style.display = 'none';
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
        });