// JavaScript for ngobras.html page
import { currentAdminId, currentAssistantId, _ngobrasPhotoPreview } from './ngobras.chat.js';
import { supabaseClient } from './ngobras.supabase.js';

export let currentChatType = 'admin';
export let currentChatName = '';
export let chatHistory = {}; // Store chat messages for each assistant/admin

// --- Memory helpers ---
export function getChatHistory(chatId) {
    // Hanya untuk AI
    if (chatId.startsWith('ai_')) {
        const key = `ngobras_chat_history_${chatId}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }
    return [];
}

export function saveChatMessage(chatId, text, isSent) {
    // Hanya untuk AI
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
export function loadAIMessages(assistantName = currentChatName) {
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
export function goBack() {
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

// Switch chat type
export function switchToAI() {
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

// Helper: Format AI response with markdown-like rules
export function formatAIResponse(text) {
    if (!text) return '';

    // Handle line breaks first
    let html = text.replace(/\r\n|\r|\n/g, '<br>');

    // Special container for <<...>> blocks with copy button
    html = html.replace(/<<([\s\S]*?)>>/g, function(match, content) {
        // Unique id for each card
        const cardId = 'ai-card-' + Math.random().toString(36).substr(2, 9);
        return `
            <div class="ai-special-card" id="${cardId}">
                <button class="copy-btn" title="Salin">
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

// Ganti window.copySolutionCard dengan export function
export function copySolutionCard(cardId) {
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

// Load AI Assistants
export async function loadAIAssistants() {
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

        // Setelah elemen card dibuat:
        const copyBtn = aiCard.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copySolutionCard(cardId));
        }
    });
}

// Show greeting when opening chat, hide on first user message
// ES6 module: gunakan wrapper, bukan override global
import { openChat as openChatModule, sendMessage as sendMessageModule } from './ngobras.chat.js';
import { showGreetingSphere, hideGreetingSphere } from './ngobras.ui.js';

export function openChatWithGreeting(type, name, ...args) {
    openChatModule(type, name, ...args);
    if (type === 'ai') {
        showGreetingSphere(name);
    } else {
        hideGreetingSphere();
    }
}

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

// Supabase
import { supabaseClient } from './ngobras.supabase.js';

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

// Gabungkan semua event listener DOMContentLoaded menjadi satu
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
        loadAdminList();
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

    // === Check login status and show modal if not logged in ===
    if (window.location.pathname.includes('ngobras')) {
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
    }

    // === Logout Modal Confirm ===
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    if (confirmBtn) {
        confirmBtn.onclick = async function() {
            if (typeof supabaseClient !== 'undefined' && supabaseClient?.auth) {
                await supabaseClient.auth.signOut();
            }
            localStorage.clear();
            window.location.href = '/login.html';
        };
    }

    // === Auth Modal Buttons (if present) ===
    if (typeof loginEmailBtn !== 'undefined' && loginEmailBtn) {
        loginEmailBtn.onclick = function() {
            window.location.href = '/login.html';
        };
    }
    if (typeof loginGoogleBtn !== 'undefined' && loginGoogleBtn) {
        loginGoogleBtn.onclick = async function() {
            if (typeof supabase === 'undefined') return;
            let config;
            try {
                const resp = await fetch('/api/supabase-config');
                config = await resp.json();
            } catch (e) {
                config = null;
            }
            if (!config || !config.url || !config.anonKey) return;
            await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/ngobras'
                }
            });
        };
    }
});

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