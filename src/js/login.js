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

        if (data.user) {
            // Login successful
            showAlert('Login berhasil! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/ngobras';
            }, 1200);
        } else {
            // Jika error karena email tidak terdaftar (Bad Request dari Supabase)
            if (error && error.status === 400 && error.message && error.message.toLowerCase().includes('invalid login credentials')) {
                showEmailNotRegisteredModal(email, password);
            } else if (error && error.message && error.message.toLowerCase().includes('invalid login credentials')) {
                showAlert('Wrong password, please try again.', 'danger');
            } else {
                showAlert('Terjadi kesalahan. Silakan coba lagi.', 'danger');
            }
        }
    } catch (err) {
        showAlert('Terjadi kesalahan. Silakan coba lagi.', 'danger');
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
    let alertDiv = document.querySelector('.alert');
    if (alertDiv) alertDiv.remove();
    alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    const form = document.getElementById('loginForm');
    form.insertBefore(alertDiv, form.firstChild);
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
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