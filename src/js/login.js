// Initialize Supabase client
let supabaseClient;

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch Supabase config from backend
    const resp = await fetch('/api/supabase-config');
    const config = await resp.json();
    supabaseClient = supabase.createClient(config.url, config.anonKey);
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
        // Try to sign in with Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
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
            // If error is "Invalid login credentials", show fast popup and stop
            if (error && error.message && error.message.toLowerCase().includes('invalid login credentials')) {
                showAlert('Wrong password, please try again.', 'danger');
                // Stop process, do not redirect
            } else {
                // For other errors, redirect to signup
                window.location.href = `/signup.html?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
            }
        }
    } catch (err) {
        showAlert('Terjadi kesalahan. Silakan coba lagi.', 'danger');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
});

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
