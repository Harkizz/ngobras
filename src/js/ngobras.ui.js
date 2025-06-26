// Typing indicator
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
}     

// Show/hide emoji picker
function toggleEmoji() {
    const picker = document.getElementById('emoji-picker');
    if (!picker) return;
    if (picker.style.display === 'none' || picker.style.display === '') {
        showEmojiPicker();
    } else {
        hideEmojiPicker();
    }
}

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

function hideEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    if (picker) picker.style.display = 'none';
    document.removeEventListener('mousedown', handleEmojiOutsideClick);
}

function handleEmojiOutsideClick(e) {
    const picker = document.getElementById('emoji-picker');
    const emojiBtn = document.querySelector('.action-btn i.fa-smile');
    if (picker && !picker.contains(e.target) && (!emojiBtn || !emojiBtn.parentNode.contains(e.target))) {
        hideEmojiPicker();
    }
}

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

function removePhotoPreview() {
    const container = document.getElementById('photo-preview-container');
    container.innerHTML = '';
    container.style.display = 'none';
    window._ngobrasPhotoPreview = null;
}

function triggerTakePhoto() {
    // For mobile, this will prompt camera; for desktop, will open file dialog
    const input = document.getElementById('fileInput');
    input.setAttribute('accept', 'image/*');
    input.setAttribute('capture', 'environment');
    input.click();
    toggleActionMenu();
}

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

// Action Menu
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

function handleActionMenuOutsideClick(e) {
    const menu = document.getElementById('action-menu');
    const btn = document.getElementById('actionMenuBtn');
    if (menu && !menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
        menu.style.display = 'none';
        document.removeEventListener('mousedown', handleActionMenuOutsideClick);
    }
}

function triggerFileUpload() {
    document.getElementById('fileInput').click();
    toggleActionMenu();
}

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