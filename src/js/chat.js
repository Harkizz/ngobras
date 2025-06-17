// Chat functionality
class ChatManager {
    constructor() {
        this.currentUser = null;
        this.messages = [];
        this.lastMessageTime = null;
        this.isInitialized = false;
    }

    async initialize(userId) {
        // Check if we're on the chat page
        const chatContainer = document.getElementById('chat-messages');
        if (!chatContainer) {
            console.debug('Not on chat page, skipping initialization');
            return;
        }

        try {
            this.currentUser = await this.fetchUserProfile(userId);
            await this.loadMessages(userId);
            this.setupMessagePolling(userId);
            this.isInitialized = true;
        } catch (error) {
            console.error('Chat initialization error:', error);
        }
    }

    async fetchUserProfile(userId) {
        try {
            // For development/testing, return mock data
            if (!process.env.PRODUCTION) {
                return {
                    id: userId,
                    username: 'Test User',
                    avatar_url: '/images/default-avatar.png'
                };
            }
            const response = await fetch(`/api/profiles/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch profile');
            return await response.json();
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    }

    async loadMessages(userId) {
        try {
            // For development/testing, return mock data
            if (!process.env.PRODUCTION) {
                this.messages = [
                    {
                        sender_id: 'ai-bot-id',
                        content: 'Hello! How can I help you today?',
                        created_at: new Date().toISOString()
                    }
                ];
                return;
            }
            const response = await fetch(`/api/messages/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch messages');
            this.messages = await response.json();
            this.renderMessages();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    setupMessagePolling(userId) {
        setInterval(() => this.loadMessages(userId), 5000);
    }

    async sendMessage(content, receiverId, chatType = 'ai') {
        if (!this.currentUser || !content.trim()) return;

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender_id: this.currentUser.id,
                    receiver_id: receiverId,
                    content: content.trim(),
                    chat_type: chatType
                })
            });

            if (!response.ok) throw new Error('Failed to send message');
            const newMessage = await response.json();
            this.messages.push(newMessage);
            this.renderMessages();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    renderMessages() {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML = this.messages
            .map(msg => this.createMessageHTML(msg))
            .join('');
        
        this.scrollToBottom();
    }

    createMessageHTML(message) {
        const isSender = message.sender_id === this.currentUser?.id;
        const profile = isSender ? message.sender : message.receiver;
        
        return `
            <div class="message ${isSender ? 'sent' : 'received'}">
                <img src="${profile?.avatar_url || '/images/default-avatar.png'}" 
                     alt="${profile?.username || 'User'}" 
                     class="avatar">
                <div class="message-content">
                    <div class="message-header">
                        <span class="username">${profile?.username || 'User'}</span>
                        <span class="time">${new Date(message.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div class="message-text">${this.escapeHtml(message.content)}</div>
                </div>
            </div>
        `;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

// Initialize chat when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const chat = new ChatManager();
    
    // For testing, you can use a fixed user ID
    // In production, this would come from your authentication system
    const testUserId = 'your-test-user-id';
    chat.initialize(testUserId);

    // Set up message input handling
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const content = messageInput.value;
                const receiverId = 'ai-bot-id'; // For AI chat
                chat.sendMessage(content, receiverId);
                messageInput.value = '';
            }
        });
    }
});
