import { currentAdminId, currentAssistantId, _ngobrasPhotoPreview } from './ngobras.chat.js';
import { currentChatType } from './ngobras.js';
import { scrollToBottom } from './ngobras.utils.js';

// Emoji Picker Data (a subset of standard emojis, you can expand this)
const EMOJI_LIST = [
    "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","😡","😠","🤬","😷","🤒","🤕","🤢","🤮","🥴","😇","🥳","🥺","🤠","🤡","🤥","🤫","🤭","🧐","🤓","😈","👿","👹","👺","💀","👻","👽","🤖","💩","😺","😸","😹","😻","😼","😽","🙀","😿","😾"
];

// Typing indicator
export function showTypingIndicator() {
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

export function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator && indicator.parentNode) {
        indicator.style.display = 'none';
        indicator.parentNode.removeChild(indicator);
    }
}

// Handle enter key
export function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}     

// Show/hide emoji picker
export function toggleEmoji() {
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

// Show greeting sphere animation
export function showGreetingSphere(assistantName) {
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
export function hideGreetingSphere() {
    const greetingContainer = document.getElementById('greeting-sphere');
    if (greetingContainer) {
        greetingContainer.style.display = 'none';
    }
    // Remove anime.js animations
    anime.remove('#greetingSphereCircle');
    anime.remove('#greetingSphereSVG');
}

export function animateGreetingTyping(text) {
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

export function getMiniSphereSVG(id = '', extraClass = '', monochrome = false) {
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
export function animateMiniSphere(id) {
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