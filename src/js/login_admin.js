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

// Initialize Supabase client
const supabaseUrl = "https://vdszykgrgbszuzybmzle.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3p5a2dyZ2JzenV6eWJtemxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODE2NTAsImV4cCI6MjA2NTU1NzY1MH0.XzLkCYEcFOOjFeoFlh6PjZmTxTrg-tblQXST37aIzDk";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForSupabase();
        // --- AUTO LOGIN FLOW ---
        const urlParams = new URLSearchParams(window.location.search);
        const hasSession = urlParams.has('access_token') || urlParams.has('session_id') || urlParams.has('refresh_token');

        if (hasSession) {
            // Hide the login form and show the spinner
            document.querySelector('.login-card').style.display = 'none';
            const autoLoginStatus = document.getElementById('autoLoginStatus');
            autoLoginStatus.style.display = 'block';
            document.getElementById('autoLoginSpinner').style.display = 'flex';
            document.getElementById('autoLoginSuccess').style.display = 'none';

            // Wait 3 seconds (simulate loading)
            await new Promise(res => setTimeout(res, 3000));

            // Try to get the session from Supabase
            if (typeof supabase === 'undefined') {
                // Show error if Supabase not loaded
                document.getElementById('autoLoginSpinner').style.display = 'none';
                autoLoginStatus.innerHTML = '<div style="color:#DC3545;">Supabase library not loaded!</div>';
                return;
            }

            // Supabase will automatically pick up the session from the URL
            const { data, error } = await supabaseClient.auth.getSession();
            if (data.session && data.session.user) {
                // Optionally, check if user is admin
                const { user } = data.session;
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('id, email, role, is_active')
                    .eq('id', user.id)
                    .single();

                if (profile && profile.role === 'admin' && profile.is_active) {
                    // Show success tick
                    document.getElementById('autoLoginSpinner').style.display = 'none';
                    document.getElementById('autoLoginSuccess').style.display = 'flex';

                    // Save admin info to localStorage
                    localStorage.setItem('ngobras_admin_id', profile.id);
                    localStorage.setItem('ngobras_admin_email', profile.email);

                    // Wait 1.5 seconds, then redirect
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1500);
                    return;
                }
            }

            // If failed, show error and show login form again
            document.getElementById('autoLoginSpinner').style.display = 'none';
            autoLoginStatus.innerHTML = '<div style="color:#DC3545;">Gagal login otomatis. Silakan login manual.</div>';
            setTimeout(() => {
                autoLoginStatus.style.display = 'none';
                document.querySelector('.login-card').style.display = '';
            }, 2000);
            return;
        }

        // Make sure supabase is loaded
        if (typeof supabase === 'undefined') {
            document.body.innerHTML = '<div class="alert alert-danger text-center"><h4>Application Error</h4><p>Failed to load required libraries. Please refresh the page.</p><button onclick="window.location.reload()" class="btn btn-primary">Refresh</button></div>';
            console.error('Supabase JS library not loaded!');
            return;
        }

        // Check for magic link session in URL
        const { data, error } = await supabaseClient.auth.getSession();
        if (data.session) {
            // Get user info
            const { user } = data.session;
            // Optionally, check if user is admin in your profiles table
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('id, email, role, is_active')
                .eq('id', user.id)
                .single();
            if (profile && profile.role === 'admin' && profile.is_active) {
                // Save admin info to localStorage
                localStorage.setItem('ngobras_admin_id', profile.id);
                localStorage.setItem('ngobras_admin_email', profile.email);
                // Redirect to admin dashboard
                window.location.href = 'admin.html';
            } else {
                showMessage('error', 'Akun Anda bukan admin atau tidak aktif.');
                // Optionally, sign out
                await supabaseClient.auth.signOut();
            }
        }
    } catch (err) {
        document.body.innerHTML = '<div class="alert alert-danger text-center"><h4>Application Error</h4><p>Failed to load required libraries. Please refresh the page.</p><button onclick="window.location.reload()" class="btn btn-primary">Refresh</button></div>';
        console.error(err);
    }
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

// Form submission
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

        // Send magic link
        try {
            const { error } = await supabaseClient.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false, // Only allow existing admins
                    emailRedirectTo: window.location.origin + '/login_admin.html'
                }
            });
            if (error) throw error;
            showMessage('success', 'Magic link telah dikirim ke email Anda. Silakan cek inbox/spam.');
            buttonText.textContent = 'Magic Link Terkirim!';
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

// Add demo credentials hint (for development)
console.log('Demo Admin Credentials:');
console.log('Email: admin@ngobras.id');
console.log('UUID: 550e8400-e29b-41d4-a716-446655440000');
console.log('---');
console.log('Email: superadmin@ngobras.id');
console.log('UUID: 6ba7b810-9dad-11d1-80b4-00c04fd430c8');
