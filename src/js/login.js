// Use the centralized Supabase client
// No need to declare supabaseClient here as it's provided by supabaseClient.js
let localSupabaseClient = null; // Use a different variable name to avoid conflicts

// Helper: pastikan centralized Supabase client sudah tersedia
function ensureSupabaseClientAvailable() {
    console.log('[Login] Checking if window.getSupabaseClient is available:', typeof window.getSupabaseClient);
    console.log('[Login] window object keys:', Object.keys(window).filter(k => k.includes('supa')));
    
    if (typeof window.getSupabaseClient !== 'function') {
        const msg = '[ERROR] getSupabaseClient function not available. Make sure supabaseClient.js is loaded before login.js';
        console.error(msg);
        
        // Log all script elements to debug loading order
        const scripts = document.querySelectorAll('script');
        console.debug('[Login] Loaded scripts:', Array.from(scripts).map(s => s.src || 'inline script'));
        
        alert(msg + '\nCek urutan <script> di HTML.');
        throw new Error(msg);
    }
    
    console.log('[Login] getSupabaseClient function is available');
}

// Initialize Supabase client using centralized client
async function initSupabase() {
    try {
        console.log('[Login] Initializing Supabase client...');
        ensureSupabaseClientAvailable();
        
        // Get client from centralized module
        console.log('[Login] Calling window.getSupabaseClient()...');
        localSupabaseClient = await window.getSupabaseClient();
        
        console.log('[Login] getSupabaseClient() returned:', localSupabaseClient ? 'valid client' : 'null/undefined');
        
        if (!localSupabaseClient) {
            console.error('[Login] Failed to get Supabase client from centralized module');
            throw new Error('Failed to get Supabase client from centralized module');
        }
        
        console.log('[Login] Supabase client initialized successfully');
        return true;
    } catch (err) {
        console.error('[Login][Supabase Init Error]', err);
        showAlert('Gagal inisialisasi Supabase: ' + err.message, 'danger');
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initSupabase();
});

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) document.getElementById('email').value = email;
});

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) return;

    const button = e.target.querySelector('.btn-login');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Masuk...';
    button.disabled = true;

    try {
        // Ensure we have a Supabase client
        if (!localSupabaseClient) {
            console.log('[Login] Supabase client not initialized, initializing now...');
            const initialized = await initSupabase();
            if (!initialized || !localSupabaseClient) {
                throw new Error('Failed to initialize Supabase client');
            }
        }
        
        // Try to sign in with Supabase
        const { data, error } = await localSupabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (data && data.user) {
            // Check if user exists in database first
            try {
                console.log('[Login] Authentication successful, checking user role...');
                const { data: profile, error: profileError } = await localSupabaseClient
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();
                
                if (profileError) {
                    console.error('[Login][Profile Query Error]', profileError);
                    showAlert('Error verifying account. Please try again.', 'danger');
                    return;
                }
                
                // Check user role
                console.log('[Login] User role:', profile?.role);
                if (profile && profile.role === 'admin') {
                    // Admin users should use the admin login page
                    showAlert('Admin accounts should use the admin login page.', 'warning');
                    setTimeout(() => {
                        window.location.href = '/login_admin.html';
                    }, 1500);
                } else if (profile && profile.role === 'user') {
                    // Regular user login successful
                    showAlert('Login berhasil! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/ngobras';
                    }, 1200);
                } else {
                    // Unknown role
                    console.error('[Login] Unknown role:', profile?.role);
                    showAlert('Account has invalid role. Please contact support.', 'danger');
                }
            } catch (profileErr) {
                console.error('[Login][Profile Check Exception]', profileErr);
                showAlert('Error verifying account. Please try again.', 'danger');
            }
        } else {
            // Handle different error scenarios
            if (error) {
                console.error('[Login] Authentication error:', error);
                
                // Check if the error is due to network issues
                if (!navigator.onLine || error.message?.includes('network') || error.message?.includes('fetch')) {
                    console.warn('[Login] Network error detected');
                    showAlert('Network error. Please check your internet connection.', 'warning');
                    return;
                }
                
                // Check if email is not registered (invalid credentials)
                if (error.status === 400 && error.message?.toLowerCase().includes('invalid login credentials')) {
                    // Check if email exists by trying to get user by email
                    try {
                        const { data: emailCheck, error: emailError } = await localSupabaseClient
                            .from('profiles')
                            .select('id')
                            .eq('email', email)
                            .maybeSingle();
                            
                        if (emailError) {
                            console.error('[Login] Email check error:', emailError);
                        }
                        
                        // If no user found with this email, suggest signup
                        if (!emailCheck || !emailCheck.id) {
                            console.log('[Login] Email not found, suggesting signup');
                            showEmailNotRegisteredModal(email, password);
                        } else {
                            // Email exists but password is wrong
                            console.log('[Login] Email found but password incorrect');
                            showAlert('Wrong password, please try again.', 'danger');
                        }
                    } catch (emailCheckErr) {
                        console.error('[Login] Email check exception:', emailCheckErr);
                        showAlert('Wrong password, please try again.', 'danger');
                    }
                } else {
                    // Other authentication errors
                    showAlert(error.message || 'Authentication error. Please try again.', 'danger');
                }
            } else {
                showAlert('Terjadi kesalahan. Silakan coba lagi.', 'danger');
            }
        }
    } catch (err) {
        console.error('[Login] Exception during login:', err);
        
        // Check if this is a network error
        if (!navigator.onLine || err.message?.includes('network') || err.message?.includes('fetch')) {
            showAlert('Network error. Please check your internet connection.', 'warning');
        } else {
            showAlert('Terjadi kesalahan. Silakan coba lagi.', 'danger');
        }
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
});

// Fungsi untuk menampilkan modal email belum terdaftar
function showEmailNotRegisteredModal(email, password) {
    document.getElementById('modalEmailText').textContent = email;
    const modal = new bootstrap.Modal(document.getElementById('emailNotRegisteredModal'));
    modal.show();
    document.getElementById('btnDaftarSekarang').onclick = function() {
        window.location.href = `/signup.html?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    };
}

// Helper function to show alerts
function showAlert(message, type = 'info') {
    // Remove existing alerts of the same type
    const existingAlerts = document.querySelectorAll(`.alert-${type}`);
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    const form = document.getElementById('loginForm');
    form.insertBefore(alertDiv, form.firstChild);
    
    // Auto dismiss after 3 seconds for non-error alerts
    if (type !== 'danger' && type !== 'warning') {
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }
    
    return alertDiv; // Return the alert div for potential further manipulation
}

function showSignup() {
    window.location.href = '/signup.html';
}

// Animasi form saat load
window.addEventListener('load', function() {
    const card = document.querySelector('.login-card');
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    setTimeout(() => {
        card.style.transition = 'all 0.6s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
    }, 100);
});

// Add network status monitoring
window.addEventListener('online', function() {
    console.log('[Login] Network connection restored');
    const networkStatus = document.getElementById('networkStatus');
    if (networkStatus) {
        networkStatus.style.display = 'none';
    } else {
        const onlineAlert = showAlert('Your internet connection has been restored.', 'success');
        setTimeout(() => onlineAlert.remove(), 3000);
    }
});

window.addEventListener('offline', function() {
    console.log('[Login] Network connection lost');
    
    // Create or show network status indicator
    let networkStatus = document.getElementById('networkStatus');
    if (!networkStatus) {
        networkStatus = document.createElement('div');
        networkStatus.id = 'networkStatus';
        networkStatus.className = 'network-status-indicator offline';
        networkStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> You are offline. Some features may be unavailable.';
        document.body.appendChild(networkStatus);
    } else {
        networkStatus.style.display = 'block';
    }
    
    showAlert('You are currently offline. Please check your internet connection.', 'warning');
});

// Check network status on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!navigator.onLine) {
        console.log('[Login] Page loaded in offline state');
        showAlert('You are currently offline. Please check your internet connection.', 'warning');
        
        // Create network status indicator
        const networkStatus = document.createElement('div');
        networkStatus.id = 'networkStatus';
        networkStatus.className = 'network-status-indicator offline';
        networkStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> You are offline. Some features may be unavailable.';
        document.body.appendChild(networkStatus);
    }
});