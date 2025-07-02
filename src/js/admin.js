function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('show');
            } else {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');
            }
        }

        /**
 * Fetch users with role 'user' from the backend API.
 * @returns {Promise<Array>} Array of user profile objects
 */
async function fetchUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        return Array.isArray(users) ? users : [];
    } catch (err) {
        console.error('[fetchUsers] Error:', err);
        return [];
    }
}

/**
 * Decode a JWT token and return its payload as an object.
 * @param {string} token - JWT access token
 * @returns {object|null} Decoded payload or null if invalid
 */
function decodeJwtPayload(token) {
    try {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodeURIComponent(escape(decoded)));
    } catch (err) {
        console.error('[decodeJwtPayload] Failed to decode JWT:', err);
        return null;
    }
}

/**
 * Get admin ID from Supabase session in localStorage (v2 compatible).
 * @returns {string|null} Admin user ID (UUID) or null if not found/invalid
 */
function getAdminIdFromToken() {
    // Try Supabase v2 session (sb-...-auth-token)
    const supaKey = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
    if (supaKey) {
        try {
            const session = JSON.parse(localStorage.getItem(supaKey));
            if (session && session.user && session.user.id) {
                return session.user.id;
            } else {
                console.error('[getAdminIdFromToken] Supabase session found but user.id missing:', session);
            }
        } catch (err) {
            console.error('[getAdminIdFromToken] Failed to parse Supabase session:', err);
        }
    }
    // Fallback: legacy custom token (deprecated)
    const token = localStorage.getItem('access_token');
    if (token) {
        const payload = decodeJwtPayload(token);
        if (payload && payload.sub) {
            return payload.sub;
        } else {
            console.error('[getAdminIdFromToken] Legacy token found but payload invalid:', payload);
        }
    }
    // If not found, show developer diagnostics
    console.error('[getAdminIdFromToken] No valid Supabase session or access_token found in localStorage.');
    return null;
}

/**
 * Supabase Realtime and Unread Message Indicator Logic
 * - Subscribes to messages table for real-time updates
 * - Fetches unread message count for each user
 * - Renders unread indicator (circle) on user list item if unread exists
 * - Robust error handling and developer diagnostics
 */

// ====== SUPABASE REALTIME INIT ======
let supabase = null;
let messagesSubscription = null;

/**
 * Initialize Supabase client for admin panel using the centralized client
 * @returns {Promise<boolean>} True if initialization successful, false otherwise
 */
async function initSupabaseForAdmin() {
    console.log('[AdminPanel] Initializing Supabase for admin panel...');
    console.log('[AdminPanel] Checking if window.getSupabaseClient is available:', typeof window.getSupabaseClient);
    console.log('[AdminPanel] window object keys:', Object.keys(window).filter(k => k.includes('supa')));
    
    try {
        // Use the centralized Supabase client
        if (typeof window.getSupabaseClient !== 'function') {
            console.error('[AdminPanel] getSupabaseClient not found. Make sure supabaseClient.js is loaded before admin.js');
            
            // Log all script elements to debug loading order
            const scripts = document.querySelectorAll('script');
            console.debug('[AdminPanel] Loaded scripts:', Array.from(scripts).map(s => s.src || 'inline script'));
            
            showAdminError('Supabase initialization function not found. Check script loading order.');
            return false;
        }
        
        console.log('[AdminPanel] getSupabaseClient function is available, calling it...');
        
        // Get the client from the centralized module
        supabase = await window.getSupabaseClient();
        
        console.log('[AdminPanel] getSupabaseClient() returned:', supabase ? 'valid client' : 'null/undefined');
        
        if (!supabase) {
            console.error('[AdminPanel] Failed to get Supabase client from centralized module');
            showAdminError('[AdminPanel] Failed to get Supabase client');
            return false;
        }
        
        // Check if supabase client has expected methods
        console.log('[AdminPanel] Supabase client methods available:',
            Object.keys(supabase).filter(k => typeof supabase[k] === 'function'));
        
        console.log('[AdminPanel] Supabase client initialized successfully');
        return true;
    } catch (err) {
        console.error('[AdminPanel] Error initializing Supabase:', err);
        showAdminError('[AdminPanel] Failed to initialize Supabase: ' + err.message);
        return false;
    }
}

/**
 * Show floating error for developer diagnostics
 */
function showAdminError(msg) {
    let container = document.getElementById('admin-error-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'admin-error-container';
        container.style.position = 'fixed';
        container.style.top = '70px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.background = '#ffb3b3';
        container.style.color = '#2C3E50';
        container.style.padding = '12px 24px';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        container.style.zIndex = '2000';
        container.style.display = 'none';
        container.style.fontWeight = 'bold';
        container.style.maxWidth = '90vw';
        container.style.textAlign = 'center';
        document.body.appendChild(container);
    }
    container.innerHTML = `${msg} <button id='close-admin-error-btn' style='margin-left:16px;background:none;border:none;font-size:1.2em;cursor:pointer;'>&times;</button>`;
    container.style.display = 'block';
    // Defensive: cek tombol close sebelum assign onclick
    setTimeout(() => {
        const closeBtn = document.getElementById('close-admin-error-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                container.style.display = 'none';
            };
        }
    }, 0);
    clearTimeout(container._timeout);
    container._timeout = setTimeout(() => {
        container.style.display = 'none';
    }, 12000);
    console.error('[AdminPanel][Error]', msg);
}

/**
 * Fetch unread message count for a user (where receiver is admin, sender is user, is_read = false)
 * @param {string} userId - User's UUID
 * @param {string} adminId - Admin's UUID
 * @returns {Promise<number>} Unread count
 */
async function fetchUnreadCount(userId, adminId) {
    try {
        if (!supabase) {
            console.log('[fetchUnreadCount] Supabase not initialized, initializing...');
            const initialized = await initSupabaseForAdmin();
            if (!initialized) {
                showAdminError('[fetchUnreadCount] Failed to initialize Supabase.');
                return 0;
            }
        }
        if (!userId || !adminId) {
            console.warn('[fetchUnreadCount] Missing userId or adminId');
            return 0;
        }
        if (!supabase || typeof supabase.from !== 'function') {
            console.error('[fetchUnreadCount] Supabase client not ready or missing .from() method');
            showAdminError('[fetchUnreadCount] Supabase client not ready.');
            return 0;
        }
        
        console.log(`[fetchUnreadCount] Fetching unread count for user ${userId} and admin ${adminId}`);
        const { count, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('sender_id', userId)
            .eq('receiver_id', adminId)
            .eq('is_read', false);
        if (error) {
            showAdminError(`[fetchUnreadCount] Error fetching unread for user ${userId}: ${error.message}`);
            return 0;
        }
        return count || 0;
    } catch (err) {
        showAdminError(`[fetchUnreadCount] Exception: ${err.message}`);
        return 0;
    }
}

/**
 * Fetch total unread messages for the admin (sum of all users)
 * @param {string} adminId - Admin's UUID
 * @returns {Promise<number>} Total unread count
 */
async function fetchTotalUnreadCount(adminId) {
    try {
        if (!supabase) {
            console.log('[fetchTotalUnreadCount] Supabase not initialized, initializing...');
            const initialized = await initSupabaseForAdmin();
            if (!initialized) {
                showAdminError('[fetchTotalUnreadCount] Failed to initialize Supabase.');
                return 0;
            }
        }
        if (!adminId) {
            console.warn('[fetchTotalUnreadCount] Missing adminId');
            return 0;
        }
        if (!supabase || typeof supabase.from !== 'function') {
            console.error('[fetchTotalUnreadCount] Supabase client not ready or missing .from() method');
            showAdminError('[fetchTotalUnreadCount] Supabase client not ready.');
            return 0;
        }
        
        console.log(`[fetchTotalUnreadCount] Fetching total unread count for admin ${adminId}`);
        const { count, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', adminId)
            .eq('is_read', false);
        if (error) {
            showAdminError(`[fetchTotalUnreadCount] Error: ${error.message}`);
            return 0;
        }
        return count || 0;
    } catch (err) {
        showAdminError(`[fetchTotalUnreadCount] Exception: ${err.message}`);
        return 0;
    }
}

// ===== ADMIN AUTH CHECK & MODAL BLOCKER =====
/**
 * Robustly check for valid Supabase admin session on page load.
 * If not found/invalid/expired/malformed, show modal and block UI.
 * Redirects to login_admin.html with email if needed.
 * Strong error handling and developer diagnostics.
 */
async function checkAdminAuth() {
    let errorType = null;
    let errorMessage = '';
    let stackTrace = '';
    let session = null;
    let supabase = null;
    try {
        // Check if Supabase client loader is available
        if (typeof window.getSupabaseClient !== 'function') {
            errorType = 'NO_SUPABASE_CLIENT';
            errorMessage = 'window.getSupabaseClient is not available. Check script order.';
            throw new Error(errorMessage);
        }
        // Get Supabase client
        supabase = await window.getSupabaseClient();
        if (!supabase || !supabase.auth) {
            errorType = 'NO_SUPABASE_AUTH';
            errorMessage = 'Supabase client or auth module not available.';
            throw new Error(errorMessage);
        }
        // Try to get session from Supabase
        session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
        if (!session) {
            // Fallback: try to get from localStorage
            const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'));
            if (key) {
                try {
                    session = JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    errorType = 'MALFORMED_TOKEN';
                    errorMessage = 'Malformed token in localStorage.';
                    stackTrace = e.stack;
                    throw e;
                }
            }
        }
        // Validate session structure
        if (!session || !session.access_token || !session.user) {
            errorType = 'NO_SESSION';
            errorMessage = 'No valid session or access token found.';
            throw new Error(errorMessage);
        }
        // Validate expiry
        const now = Math.floor(Date.now() / 1000);
        const exp = session.expires_at || (session.user && session.user.exp);
        if (exp && now > exp) {
            errorType = 'TOKEN_EXPIRED';
            errorMessage = 'Session token expired.';
            throw new Error(errorMessage);
        }
        // Optionally: check if user is admin (by role/email)
        // If you want to restrict to admin only, check here
        // Example: if (!session.user.email.endsWith('@admin-domain.com')) { ... }
        // If all checks pass, return true
        return true;
    } catch (error) {
        if (!errorType) errorType = 'UNKNOWN';
        if (!errorMessage) errorMessage = error.message;
        stackTrace = error.stack;
        // Log error in required format
        console.error('[ADMIN_AUTH]', {
            error: errorType,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            stackTrace
        });
        showAdminAuthModal(errorType, errorMessage);
        return false;
    }
}

/**
 * Show the admin login modal and block interaction
 * @param {string} errorType
 * @param {string} errorMessage
 */
function showAdminAuthModal(errorType, errorMessage) {
    const modal = document.getElementById('admin-auth-modal');
    const errorDiv = document.getElementById('admin-auth-modal-error');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (errorDiv) {
        if (errorType || errorMessage) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = errorType ? `[${errorType}] ${errorMessage}` : errorMessage;
        } else {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }
    // Focus modal for accessibility
    setTimeout(() => {
        const content = modal.querySelector('.ngobras-auth-modal__content');
        if (content) content.focus();
    }, 100);
    // Prevent closing modal by keyboard or click
    modal.addEventListener('keydown', function(e) {
        e.stopPropagation();
        if (e.key === 'Escape' || e.key === 'Enter') {
            e.preventDefault();
        }
    });
    // Login button handler
    const loginBtn = document.getElementById('admin-auth-login-btn');
    if (loginBtn) {
        loginBtn.onclick = function() {
            try {
                window.location.href = 'login_admin.html';
            } catch (err) {
                if (errorDiv) {
                    errorDiv.style.display = 'block';
                    errorDiv.textContent = 'Redirect gagal. Silakan refresh halaman.';
                }
                console.error('[AdminAuthModal] Redirect error:', err);
            }
        };
    }
}

// Block all admin logic until authenticated
// This must be the first DOMContentLoaded handler
// All other admin logic must be after this check

document.addEventListener('DOMContentLoaded', async function() {
    const isAdminAuth = await checkAdminAuth();
    if (!isAdminAuth) return;
    // Only run the rest if authenticated
    refreshConsultationsUnreadBadge().catch(err => {
        showAdminError('[Init] Failed to refresh consultations unread badge: ' + err.message);
    });
});

// Patches moved after function definitions (see below)

// Update the unread badge in the sidebar menu for Consultations (with error log)
function updateConsultationsUnreadBadge(totalUnread) {
    const badge = document.getElementById('consultations-unread-badge');
    if (!badge) {
        showAdminError('[updateConsultationsUnreadBadge] Badge element not found in DOM.');
        return;
    }
    if (typeof totalUnread !== 'number') {
        showAdminError('[updateConsultationsUnreadBadge] totalUnread is not a number: ' + totalUnread);
        badge.setAttribute('hidden', '');
        return;
    }
    console.log('[updateConsultationsUnreadBadge] Total unread:', totalUnread);
    if (totalUnread > 0) {
        badge.textContent = totalUnread;
        badge.removeAttribute('hidden');
    } else {
        badge.textContent = '';
        badge.setAttribute('hidden', '');
    }
}

// Function removed (duplicate of the one at lines 283-302)

/**
 * Refresh the consultations unread badge
 * - Patch: Call this after rendering user list and on realtime update
 */
async function refreshConsultationsUnreadBadge() {
    const adminId = getAdminIdFromToken();
    if (!adminId) {
        showAdminError('[refreshConsultationsUnreadBadge] Admin ID not found.');
        return;
    }
    const totalUnread = await fetchTotalUnreadCount(adminId);
    updateConsultationsUnreadBadge(totalUnread);
}

/**
 * Render user list items in the consultation section, with unread indicator (number inside)
 * @param {Array} users - Array of user profile objects
 */
async function renderUserList(users) {
    const listContainer = document.querySelector('.user-chat-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    const adminId = getAdminIdFromToken();
    if (!adminId) {
        showAdminError('[renderUserList] Admin ID not found in session.');
        return;
    }
    for (const user of users) {
        // Create user list item
        const item = document.createElement('div');
        item.className = 'user-list-item';
        item.tabIndex = 0; // Make focusable for accessibility
        // Avatar with online indicator (dummy online for now)
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar online';
        const img = document.createElement('img');
        img.src = user.avatar_url || 'images/default-avatar.png';
        img.alt = 'User Avatar';
        avatar.appendChild(img);
        // Chat info
        const info = document.createElement('div');
        info.className = 'user-chat-info';
        // Header: name + role
        const header = document.createElement('div');
        header.className = 'user-chat-header';
        const name = document.createElement('span');
        name.className = 'user-name';
        name.textContent = user.full_name || user.username || user.email || 'Unknown';
        // Show user role
        const role = document.createElement('span');
        role.className = 'user-role-badge';
        role.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
        header.appendChild(name);
        header.appendChild(role);
        // Last message (placeholder)
        const lastMsg = document.createElement('div');
        lastMsg.className = 'user-last-message';
        lastMsg.textContent = user.last_message || 'No recent messages.';
        // Unread indicator (circle with number)
        const unread = document.createElement('span');
        unread.className = 'unread-indicator';
        unread.setAttribute('hidden', ''); // Hide by default
        unread.title = 'Unread messages';
        header.appendChild(unread);
        // Assemble
        info.appendChild(header);
        info.appendChild(lastMsg);
        item.appendChild(avatar);
        item.appendChild(info);
        // Add click handler for opening chatroom_admin.html
        item.addEventListener('click', function() {
            const adminId = getAdminIdFromToken();
            if (!adminId) {
                showAdminError('[UserListItem] Admin ID not found in session.');
                return;
            }
            if (!user.id) {
                showAdminError('[UserListItem] User ID missing.');
                return;
            }
            // Redirect to chatroom_admin.html with admin_id and user_id as query params
            window.location.href = `chatroom_admin.html?admin_id=${encodeURIComponent(adminId)}&user_id=${encodeURIComponent(user.id)}`;
        });
        // Also support keyboard enter for accessibility
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            }
        });
        listContainer.appendChild(item);
        // Fetch and show unread count
        fetchUnreadCount(user.id, adminId).then(count => {
            if (count > 0) {
                unread.textContent = count;
                unread.removeAttribute('hidden');
            } else {
                unread.textContent = '';
                unread.setAttribute('hidden', '');
            }
        }).catch(err => {
            showAdminError(`[renderUserList] Failed to fetch unread count for user ${user.id}: ${err.message}`);
        });
    }
}

/**
 * Subscribe to Supabase Realtime for messages table
 * On any change, re-fetch unread counts for all users
 * @param {Array} users - Array of user profile objects
 */
async function subscribeToMessagesRealtime(users) {
    try {
        if (!supabase) {
            console.log('[subscribeToMessagesRealtime] Supabase not initialized, initializing...');
            const initialized = await initSupabaseForAdmin();
            if (!initialized) {
                showAdminError('[subscribeToMessagesRealtime] Failed to initialize Supabase.');
                return;
            }
        }
        
        console.log('[subscribeToMessagesRealtime] Checking supabase client:',
            supabase ? 'exists' : 'null/undefined');
        
        if (supabase) {
            console.log('[subscribeToMessagesRealtime] Supabase methods available:',
                Object.keys(supabase).filter(k => typeof supabase[k] === 'function'));
        }
        
        if (!supabase || typeof supabase.channel !== 'function') {
            console.error('[subscribeToMessagesRealtime] Supabase client not ready or missing .channel() method');
            showAdminError('[subscribeToMessagesRealtime] Supabase client not ready.');
            return;
        }
        
        console.log('[subscribeToMessagesRealtime] Setting up realtime subscription');
        if (messagesSubscription) {
            supabase.removeChannel(messagesSubscription);
            messagesSubscription = null;
        }
        messagesSubscription = supabase.channel('admin-messages-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
            }, payload => {
                // On any change, re-render user list (unread indicators)
                loadUserList();
            })
            .subscribe();
    } catch (err) {
        showAdminError('[subscribeToMessagesRealtime] Failed to subscribe: ' + err.message);
    }
}

// ===== Function patches for unread badge updates =====
// Patch: Always call refreshConsultationsUnreadBadge after user list render
const _origRenderUserList = renderUserList;
renderUserList = async function(users) {
    await _origRenderUserList(users);
    await refreshConsultationsUnreadBadge();
};

// Patch: Also call refreshConsultationsUnreadBadge in subscribeToMessagesRealtime
const _origSubscribeToMessagesRealtime = subscribeToMessagesRealtime;
subscribeToMessagesRealtime = async function(users) {
    await _origSubscribeToMessagesRealtime(users);
    await refreshConsultationsUnreadBadge();
};

/**
 * Load and render user list in consultation section, with unread indicators and realtime
 */
async function loadUserList() {
    const users = await fetchUsers();
    await renderUserList(users);
    await subscribeToMessagesRealtime(users);
}

// Show user list when consultation section is shown
function showSection(sectionName, event) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
        // Load user list if consultation section
        if (sectionName === 'consultations') {
            loadUserList();
        }
    }

    // Update active nav link robustly
    try {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        if (event && event.target && typeof event.target.closest === 'function') {
            const navLink = event.target.closest('.nav-link');
            if (navLink) navLink.classList.add('active');
        } else {
            // Fallback: activate by sectionName
            document.querySelectorAll('.nav-link[data-section]').forEach(link => {
                if (link.getAttribute('data-section') === sectionName) {
                    link.classList.add('active');
                }
            });
        }
    } catch (err) {
        showAdminError('[showSection] Failed to update nav active state: ' + err.message);
    }

    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('show');
    }
}

// ===== Handle hash-based navigation for admin sections =====
function showSectionFromHash() {
    // Get section from hash (default to dashboard)
    let section = (window.location.hash || '#dashboard').replace('#', '');
    if (!section) section = 'dashboard';
    showSection(section);
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-section') === section) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Listen for hash changes and on page load
window.addEventListener('hashchange', showSectionFromHash);
document.addEventListener('DOMContentLoaded', showSectionFromHash);

// Update sidebar nav links to use hash navigation, prevent default and update hash
function setupSidebarNavLinks() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            if (section) {
                window.location.hash = '#' + section;
            }
        });
    });
}
document.addEventListener('DOMContentLoaded', setupSidebarNavLinks);