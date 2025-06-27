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

document.addEventListener('DOMContentLoaded', async () => {
    // No more Supabase session check in frontend. All admin login handled via backend.
});

// Form elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('adminEmail');
const loginButton = document.getElementById('loginButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const loginIcon = document.getElementById('loginIcon');
const buttonText = document.getElementById('buttonText');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Real-time validation
if (emailInput) {
    emailInput.addEventListener('input', function() {
        const emailValidation = document.getElementById('emailValidation');
        const email = this.value.trim();

        if (email === '') {
            emailValidation.style.display = 'none';
            this.style.borderColor = 'var(--very-light-blue)';
        } else if (validateEmail(email)) {
            emailValidation.textContent = '✓ Format email valid';
            emailValidation.className = 'form-validation success';
            this.style.borderColor = 'var(--success-green)';
        } else {
            emailValidation.textContent = '✗ Format email tidak valid';
            emailValidation.className = 'form-validation error';
            this.style.borderColor = 'var(--error-red)';
        }
    });
}

// Show message function
function showMessage(type, message) {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';

    if (type === 'error') {
        document.getElementById('errorText').textContent = message;
        errorMessage.style.display = 'block';
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
    } else if (type === 'success') {
        document.getElementById('successText').textContent = message;
        successMessage.style.display = 'block';
    }
}

// Submit login form
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) {
            showMessage('error', 'Email admin wajib diisi');
            return;
        }
        loginButton.disabled = true;
        buttonText.textContent = 'Mengirim...';
        try {
            // Kirim request magic link ke backend
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }) // Hanya email, tanpa uuid
            });
            const result = await response.json();
            if (response.ok && result.success) {
                showMessage('success', 'Magic link berhasil dikirim. Silakan cek inbox/spam email Anda.');
            } else {
                showMessage('error', result.error || 'Email ini bukan admin.');
            }
            buttonText.textContent = 'Kirim Magic Link';
        } catch (err) {
            showMessage('error', err.message || 'Gagal mengirim magic link.');
            buttonText.textContent = 'Kirim Magic Link';
        }
        loginButton.disabled = false;
    });
}

// Load saved email if remember me was checked
window.addEventListener('load', function() {
    if (localStorage.getItem('ngobras_remember') === 'true') {
        const savedEmail = localStorage.getItem('ngobras_admin_email');
        if (savedEmail) {
            emailInput.value = savedEmail;
            rememberMe.checked = true;
            uuidInput.focus();
        }
    }
});

// Add some interactive effects
document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        loginForm.dispatchEvent(new Event('submit'));
    }
});
