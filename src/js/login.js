// Wait for Supabase library to be loaded before running the rest of the code
function waitForSupabase(retries = 10, delay = 200) {
    return new Promise((resolve, reject) => {
        function check() {
            if (typeof supabase !== 'undefined') {
                resolve();
            } else if (retries > 0) {
                setTimeout(() => check(--retries, delay), delay);
            } else {
                reject(new Error('Supabase library failed to load.'));
            }
        }
        check();
    });
}

// Autofill email if present in URL
const params = new URLSearchParams(window.location.search);
const email = params.get('email');
if (email) document.getElementById('email').value = email;

// Login handler for Vercel/Next.js API route
// This will POST to /api/login, which must be implemented as an API route (not Express) on Vercel
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
        // Login via backend API (Vercel API route)
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (response.ok && result.user) {
            // Login successful
            showAlert('Login berhasil! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/ngobras';
            }, 1200);
        } else if (result.error && result.error.toLowerCase().includes('invalid')) {
            showAlert('Wrong password, please try again.', 'danger');
            // Stop process, do not redirect
        } else {
            // For other errors, redirect to signup
            window.location.href = `/signup.html?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
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