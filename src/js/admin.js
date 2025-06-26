// Identity check before loading admin.html
export function identityCheck() {
    (function() {
        // Use unique variable names to avoid redeclaration
        const _adminId = localStorage.getItem('ngobras_admin_id');
        const _adminEmail = localStorage.getItem('ngobras_admin_email');

        if (!_adminId || !_adminEmail) {
            // Not logged in, redirect to check_status.html first
            window.location.replace('check_status.html');
            throw new Error('Redirecting to check_status.html for identity check.');
        }
        // Optionally, you can add further validation here (e.g., check token/session)
    })();
}

export function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('show');
            } else {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            }
        }

export function showSection(sectionName) {
            // Hide all sections
            const sections = document.querySelectorAll('.content-section');
            sections.forEach(section => {
                section.style.display = 'none';
            });

            // Show selected section
            const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
        // Load user list if Messages section
        if (sectionName === 'messages') {
            loadUserList();
            // Hide chat room if open
            document.getElementById('admin-chat-section').style.display = 'none';
        }
    }
            
            // Update active nav link
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
            event.target.closest('.nav-link').classList.add('active');
            
            // Close sidebar on mobile after selection
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('show');
            }
        }

        // Auto-update time
        function updateTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID');
            const dateString = now.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Update if time display exists
            const timeDisplay = document.querySelector('.current-time');
            if (timeDisplay) {
                timeDisplay.textContent = `${dateString}, ${timeString}`;
            }
        }

        // Simulate real-time data updates
        function updateStats() {
            const statValues = document.querySelectorAll('.stat-value');
            statValues.forEach(stat => {
                const currentValue = parseInt(stat.textContent.replace(/,/g, ''));
                const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                const newValue = Math.max(0, currentValue + change);
                stat.textContent = newValue.toLocaleString();
            });
        }

        // Add notification animation
        function animateNotification() {
            const notificationBtn = document.querySelector('.notification-btn');
            notificationBtn.style.animation = 'pulse 1s ease-in-out';
            setTimeout(() => {
                notificationBtn.style.animation = '';
            }, 1000);
        }

        // Handle window resize
        window.addEventListener('resize', function() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            
            if (window.innerWidth > 768) {
                sidebar.classList.remove('show');
                if (sidebar.classList.contains('collapsed')) {
                    mainContent.classList.add('expanded');
                } else {
                    mainContent.classList.remove('expanded');
                }
            } else {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
            }
        });

        // Initialize page
        document.addEventListener('DOMContentLoaded', function() {
            updateTime();
            setInterval(updateTime, 1000);
            setInterval(updateStats, 30000); // Update stats every 30 seconds
            setInterval(animateNotification, 60000); // Animate notification every minute
        });

        // Add smooth scrolling for tables
        document.querySelectorAll('.table-responsive').forEach(table => {
            table.style.scrollBehavior = 'smooth';
        });

        // Add click effects for cards
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', function() {
                this.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            });
        });

        // Add loading states for buttons
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                if (!this.classList.contains('no-loading')) {
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                    this.disabled = true;
                    
                    setTimeout(() => {
                        this.innerHTML = originalText;
                        this.disabled = false;
                    }, 1500);
                }
            });
        });

        // Add search functionality (placeholder)
        function handleSearch(query) {
            console.log('Searching for:', query);
            // Implement search logic here
        }

        // Add export functionality (placeholder)
        function exportData(type) {
            console.log('Exporting:', type);
            // Implement export logic here
        }

        // Add filter functionality (placeholder)
        function applyFilter(criteria) {
            console.log('Applying filter:', criteria);
            // Implement filter logic here
        }

        // Fetch and display user list in the Messages section
async function loadUserList() {
    const userListDiv = document.getElementById('user-list');
    if (!userListDiv) return;

    userListDiv.innerHTML = '<div>Loading...</div>';

    try {
        const res = await fetch('/api/users');
        const users = await res.json();

        if (!Array.isArray(users) || users.length === 0) {
            userListDiv.innerHTML = '<div class="text-muted">Belum ada akun pengguna terdaftar.</div>';
            return;
        }

        userListDiv.innerHTML = users.map(user => `
            <div class="user-list-item d-flex align-items-center mb-3 p-2 rounded"
                 style="background: #f8fafc; cursor:pointer;"
                 data-user-id="${user.id}">
                <img src="${user.avatar_url || '/images/default-avatar.png'}" alt="avatar" class="rounded-circle me-3" width="40" height="40">
                <div>
                    <div class="fw-semibold">${user.full_name || user.username || '(Tanpa Nama)'}</div>
                    <div class="text-muted small">${user.email}</div>
                </div>
            </div>
        `).join('');

        // Add click event listeners to each user item
        userListDiv.querySelectorAll('.user-list-item').forEach(item => {
            item.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                openAdminChatRoom(userId);
            });
        });

    } catch (err) {
        userListDiv.innerHTML = '<div class="text-danger">Gagal memuat daftar pengguna.</div>';
    }
}

let currentChatUserId = null;
let currentChatUserName = '';

// Fetch and display messages for the selected user-admin chat
async function loadAdminChatMessages(userId) {
    const chatDiv = document.getElementById('admin-chat-messages');
    chatDiv.innerHTML = '<div class="text-muted">Memuat pesan...</div>';

    const adminId = localStorage.getItem('ngobras_admin_id');
    if (!adminId) {
        chatDiv.innerHTML = '<div class="text-danger">Admin tidak terautentikasi.</div>';
        return;
    }

    try {
        // Fetch langsung dari Supabase client-side (bukan endpoint backend)
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        if (!Array.isArray(messages) || messages.length === 0) {
            chatDiv.innerHTML = '<div class="text-muted">Belum ada pesan.</div>';
            return;
        }

        // Render messages
        chatDiv.innerHTML = messages.map(msg => {
            const isSent = msg.sender_id === adminId;
            return `
                <div class="mb-2 ${isSent ? 'text-end' : 'text-start'}">
                    <span class="badge ${isSent ? 'bg-primary' : 'bg-secondary'}">
                        ${msg.content}
                    </span>
                    <div style="font-size:0.8em;color:#888;">${new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            `;
        }).join('');
        chatDiv.scrollTop = chatDiv.scrollHeight;
    } catch (err) {
        chatDiv.innerHTML = '<div class="text-danger">Gagal memuat pesan.</div>';
    }
}

// When opening a chat room, call the loader
async function openAdminChatRoom(userId) {
    const adminId = localStorage.getItem('ngobras_admin_id');
    if (!adminId) {
        console.log('adminId tidak ditemukan');
        return;
    }
    if (!userId) {
        console.log('userId tidak ditemukan');
        return;
    }
    // Simpan userId ke localStorage
    localStorage.setItem('ngobras_current_user_id', userId);
    console.log('userId didapatkan:', userId);

    // Fetch messages langsung dari Supabase client
    try {
        // Pastikan window.supabase sudah ada (CDN: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2)
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase JS library belum dimuat. Pastikan <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> sudah ada sebelum admin.js!');
        }
        if (typeof window.supabaseClient === 'undefined') {
            const resp = await fetch('/api/supabase-config');
            const config = await resp.json();
            window.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
        }
        const { data: messages, error } = await window.supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        if (!Array.isArray(messages)) throw new Error('Format messages tidak valid');
        localStorage.setItem('ngobras_current_messages', JSON.stringify(messages));
        console.log('Messages berhasil di-fetch dan disimpan ke localStorage.');
    } catch (err) {
        console.error('Gagal fetch messages:', err.message);
    }

    document.getElementById('messages-section').style.display = 'none';
    document.getElementById('admin-chat-section').style.display = 'block';

    // Fetch user profile for display
    const res = await fetch(`/api/profiles/${userId}`);
    const user = await res.json();
    currentChatUserId = userId;
    currentChatUserName = user.full_name || user.username || '(Tanpa Nama)';
    document.getElementById('chatUserName').textContent = currentChatUserName;

    // Load chat messages from database
    loadAdminChatMessages(userId);

    // Focus input
    setTimeout(() => {
        document.getElementById('admin-chat-input').focus();
    }, 200);
}

export function backToUserList() {
    // Hapus ngobras_current_user_id dari localStorage
    if (localStorage.getItem('ngobras_current_user_id')) {
        localStorage.removeItem('ngobras_current_user_id');
        console.log('userId dikembalikan');
    }
    document.getElementById('admin-chat-section').style.display = 'none';
    document.getElementById('messages-section').style.display = 'block';
}

// --- ADMIN CHAT MESSAGE SENDING SYSTEM ---

// Helper: Validate input (not empty, not just whitespace)
function validateAdminChatInput(input) {
    return input && input.trim().length > 0;
}

// Helper: Log admin message actions
function logAdminMessageAction(success, adminName, userName, error) {
    const msg = success
        ? `${adminName} successfully sent a message to ${userName}`
        : `${adminName} failed to send a message to ${userName}`;
    if (success) {
        console.log(msg);
    } else {
        console.error(msg + (error ? `: ${error}` : ''));
    }
    adminUILog(msg + (error ? `: ${error}` : ''), success ? 'success' : 'error');
}

// Helper: Send message to Supabase 'messages' table
async function sendAdminMessageToUser({ senderId, receiverId, content }) {
    try {
        if (!window.supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        // Adapt to your messages table structure
        const { data, error, status } = await window.supabaseClient
            .from('messages')
            .insert([
                {
                    sender_id: senderId,
                    receiver_id: receiverId,
                    content: content,
                    // Add other required fields if needed (e.g., is_read, created_at)
                }
            ]);
        if (error) throw error;
        return { success: true, data, status };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Event: Enable send button only if input is valid
const adminChatInput = document.getElementById('admin-chat-input');
const sendBtn = document.getElementById('sendBtn');
if (adminChatInput && sendBtn) {
    adminChatInput.addEventListener('input', function() {
        sendBtn.disabled = !validateAdminChatInput(adminChatInput.value);
    });
}

// Event: Handle send button (form submit)
const adminChatForm = document.getElementById('admin-chat-form');
if (adminChatForm) {
    adminChatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const content = adminChatInput.value;
        if (!validateAdminChatInput(content)) {
            logAdminMessageAction(false, 'Admin', currentChatUserName, 'Input kosong');
            return;
        }
        const senderId = localStorage.getItem('ngobras_admin_id');
        const receiverId = localStorage.getItem('ngobras_current_user_id');
        const adminName = localStorage.getItem('ngobras_admin_email') || 'Admin';
        try {
            const result = await sendAdminMessageToUser({ senderId, receiverId, content });
            if (result.success) {
                logAdminMessageAction(true, adminName, currentChatUserName);
                adminChatInput.value = '';
                sendBtn.disabled = true;
                // Reload chat messages
                loadAdminChatMessages(receiverId);
            } else {
                logAdminMessageAction(false, adminName, currentChatUserName, result.error);
            }
        } catch (err) {
            logAdminMessageAction(false, adminName, currentChatUserName, err.message);
        }
    });
}

// Utility: Log to both console and UI log panel
function adminUILog(message, type = 'info') {
    const logPanel = document.getElementById('admin-log-messages');
    if (logPanel) {
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry = document.createElement('div');
        entry.textContent = `[${time}] ${message}`;
        entry.style.marginBottom = '2px';
        if (type === 'error') entry.style.color = '#ff6b6b';
        if (type === 'success') entry.style.color = '#4caf50';
        logPanel.appendChild(entry);
        // Scroll to bottom
        logPanel.parentElement.scrollTop = logPanel.parentElement.scrollHeight;
        // Limit log entries
        while (logPanel.children.length > 30) logPanel.removeChild(logPanel.firstChild);
    }
    if (type === 'error') {
        console.error(message);
    } else if (type === 'success') {
        console.log(message);
    } else {
        console.info(message);
    }
}