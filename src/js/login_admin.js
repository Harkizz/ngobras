// ===== SUPABASE CLIENT INITIALIZATION (using centralized client) =====
let supabase = null;
// Helper: pastikan centralized Supabase client sudah tersedia
function ensureSupabaseClientAvailable() {
    console.log('[LoginAdmin] Checking if window.getSupabaseClient is available:', typeof window.getSupabaseClient);
    console.log('[LoginAdmin] window object keys:', Object.keys(window).filter(k => k.includes('supa')));
    
    if (typeof window.getSupabaseClient !== 'function') {
        const msg = '[ERROR] getSupabaseClient function not available. Make sure supabaseClient.js is loaded before login_admin.js';
        console.error(msg);
        
        // Log all script elements to debug loading order
        const scripts = document.querySelectorAll('script');
        console.debug('[LoginAdmin] Loaded scripts:', Array.from(scripts).map(s => s.src || 'inline script'));
        
        showError(msg + '\nCek urutan <script> di HTML.');
        throw new Error(msg);
    }
    
    console.log('[LoginAdmin] getSupabaseClient function is available');
}
async function initializeSupabase() {
    try {
        console.log('[LoginAdmin] Initializing Supabase client...');
        ensureSupabaseClientAvailable();
        
        // Get client from centralized module
        console.log('[LoginAdmin] Calling window.getSupabaseClient()...');
        supabase = await window.getSupabaseClient();
        
        console.log('[LoginAdmin] getSupabaseClient() returned:', supabase ? 'valid client' : 'null/undefined');
        
        if (!supabase) {
            console.error('[LoginAdmin] Failed to get Supabase client from centralized module');
            throw new Error('Failed to get Supabase client from centralized module');
        }
        
        // For backward compatibility
        window.supabaseClient = supabase;
        console.log('[LoginAdmin] Set window.supabaseClient for backward compatibility');
        
        console.log('[LoginAdmin] Supabase client initialized successfully');
        return true;
    } catch (err) {
        console.error('[LoginAdmin][Supabase Init Error]', err);
        showError('A server error occurred during Supabase initialization. Please check your internet connection and try again.');
        // Developer diagnostics
        const devMsg = document.createElement('div');
        devMsg.style.color = '#b00';
        devMsg.style.fontSize = '0.95em';
        devMsg.style.marginTop = '8px';
        devMsg.innerHTML = '<b>Developer debug:</b> ' + (err && err.stack ? err.stack : err);
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) errorMessage.appendChild(devMsg);
        return false;
    }
}

function showError(msg) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorMessage && errorText) {
        errorText.textContent = msg;
        errorMessage.style.display = 'block';
    }
}
function showSuccess(msg) {
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    if (successMessage && successText) {
        successText.textContent = msg;
        successMessage.style.display = 'block';
    }
}

// ===== LOGIN TAB SWITCHING & PASSWORD TOGGLE =====
document.addEventListener('DOMContentLoaded', function() {
    initializeSupabase();
    // Tab switching logic
    const tabMagic = document.getElementById('tab-magic-link');
    const tabPassword = document.getElementById('tab-password');
    const magicForm = document.getElementById('magicLinkForm');
    const passwordForm = document.getElementById('passwordForm');

    if (tabMagic && tabPassword && magicForm && passwordForm) {
        tabMagic.addEventListener('click', function() {
            tabMagic.classList.add('active');
            tabPassword.classList.remove('active');
            magicForm.style.display = '';
            passwordForm.style.display = 'none';
        });
        tabPassword.addEventListener('click', function() {
            tabPassword.classList.add('active');
            tabMagic.classList.remove('active');
            magicForm.style.display = 'none';
            passwordForm.style.display = '';
        });
    }

    // Password show/hide toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('adminPassword');
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // ===== PASSWORD LOGIN FORM HANDLER (Supabase Auth Integration) =====
    const passwordLoginForm = document.getElementById('passwordForm');
    const passwordLoginButton = document.getElementById('passwordLoginButton');
    const passwordLoadingSpinner = document.getElementById('passwordLoadingSpinner');
    const passwordLoginIcon = document.getElementById('passwordLoginIcon');
    const passwordButtonText = document.getElementById('passwordButtonText');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');

    if (passwordLoginForm) {
        passwordLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            errorText.textContent = '';
            successText.textContent = '';
            const email = document.getElementById('passwordEmail').value.trim();
            const password = document.getElementById('adminPassword').value;
            if (!email || !password) {
                showError('Please enter both email and password.');
                return;
            }
            passwordLoadingSpinner.style.display = 'inline-block';
            passwordLoginIcon.style.display = 'none';
            passwordButtonText.textContent = 'Logging in...';
            passwordLoginButton.classList.add('loading');
            passwordLoginButton.disabled = true;
            try {
                if (!supabase) {
                    console.log('[LoginAdmin] Supabase client not initialized, initializing now...');
                    const initialized = await initializeSupabase();
                    if (!initialized || !supabase) {
                        throw new Error('Failed to initialize Supabase client');
                    }
                }
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    showError(error.message || 'Login failed. Please try again.');
                    console.error('[Supabase Auth Error]', error);
                } else if (data && data.session) {
                    // Session is automatically stored by supabase-js in localStorage
                    showSuccess('Login successful! Redirecting...');
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1200);
                } else {
                    showError('Unexpected error: No session returned.');
                    console.error('[Supabase Auth Unexpected]', data);
                }
            } catch (err) {
                showError('A network or server error occurred. Please try again.');
                console.error('[Admin Login Exception]', err);
            } finally {
                passwordLoadingSpinner.style.display = 'none';
                passwordLoginIcon.style.display = 'inline-block';
                passwordButtonText.textContent = 'Login';
                passwordLoginButton.classList.remove('loading');
                passwordLoginButton.disabled = false;
            }
        });
    }

    // (Optional) Add form submit handlers for both forms here
    // ...
});