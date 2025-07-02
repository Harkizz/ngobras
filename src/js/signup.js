// Use the centralized Supabase client
// No need to declare supabaseClient here as it's provided by supabaseClient.js
let localSupabaseClient = null; // Use a different variable name to avoid conflicts

// Helper: pastikan centralized Supabase client sudah tersedia
function ensureSupabaseClientAvailable() {
    console.log('[Signup] Checking if window.getSupabaseClient is available:', typeof window.getSupabaseClient);
    console.log('[Signup] window object keys:', Object.keys(window).filter(k => k.includes('supa')));
    
    if (typeof window.getSupabaseClient !== 'function') {
        const msg = '[ERROR] getSupabaseClient function not available. Make sure supabaseClient.js is loaded before signup.js';
        console.error(msg);
        
        // Log all script elements to debug loading order
        const scripts = document.querySelectorAll('script');
        console.debug('[Signup] Loaded scripts:', Array.from(scripts).map(s => s.src || 'inline script'));
        
        alert(msg + '\nCek urutan <script> di HTML.');
        throw new Error(msg);
    }
    
    console.log('[Signup] getSupabaseClient function is available');
}

// Initialize Supabase client using centralized client
async function initSupabase() {
    try {
        console.log('[Signup] Initializing Supabase client...');
        ensureSupabaseClientAvailable();
        
        // Get client from centralized module
        console.log('[Signup] Calling window.getSupabaseClient()...');
        localSupabaseClient = await window.getSupabaseClient();
        
        console.log('[Signup] getSupabaseClient() returned:', localSupabaseClient ? 'valid client' : 'null/undefined');
        
        if (!localSupabaseClient) {
            console.error('[Signup] Failed to get Supabase client from centralized module');
            throw new Error('Failed to get Supabase client from centralized module');
        }
        
        console.log('[Signup] Supabase client initialized successfully');
        return true;
    } catch (error) {
        console.error('[Signup][Supabase Init Error]', error);
        showAlert('Error initializing application: ' + error.message, 'danger');
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initSupabase();
});

// Password strength checker
document.getElementById('password').addEventListener('input', function() {
    const password = this.value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let text = '';
    let color = '';
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    switch(strength) {
        case 0:
        case 1:
            text = 'Password sangat lemah';
            color = '#ef4444';
            break;
        case 2:
            text = 'Password lemah';
            color = '#f59e0b';
            break;
        case 3:
            text = 'Password sedang';
            color = '#eab308';
            break;
        case 4:
            text = 'Password kuat';
            color = '#22c55e';
            break;
        case 5:
            text = 'Password sangat kuat';
            color = '#10b981';
            break;
    }
    
    strengthFill.style.width = (strength * 20) + '%';
    strengthFill.style.background = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
});

// Confirm password validation
document.getElementById('confirmPassword').addEventListener('input', function() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    
    if (confirmPassword && password !== confirmPassword) {
        this.classList.add('is-invalid');
        this.classList.remove('is-valid');
    } else if (confirmPassword) {
        this.classList.add('is-valid');
        this.classList.remove('is-invalid');
    } else {
        this.classList.remove('is-valid', 'is-invalid');
    }
});

// Form validation and submission
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const requiredFields = ['fullName', 'email', 'phone', 'password', 'confirmPassword', 'gender'];
    let isValid = true;
    
    // Basic form validation
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.classList.add('is-invalid');
            isValid = false;
        } else {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        }
    });
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const button = document.getElementById('submitBtn');
    const originalText = button.innerHTML;

    if (password !== confirmPassword) {
        document.getElementById('confirmPassword').classList.add('is-invalid');
        showAlert('Passwords do not match', 'danger');
        isValid = false;
    }
    
    if (!agreeTerms) {
        showAlert('You must agree to the terms and conditions', 'danger');
        isValid = false;
    }
    
    if (isValid) {
        try {
            // Check network status first
            if (!navigator.onLine) {
                console.warn('[Signup] Network offline detected');
                showAlert('You appear to be offline. Please check your internet connection and try again.', 'warning');
                return;
            }
            
            // Update UI to show loading state
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing up...';
            button.disabled = true;
            
            // Ensure we have a Supabase client
            if (!localSupabaseClient) {
                console.log('[Signup] Supabase client not initialized, initializing now...');
                const initialized = await initSupabase();
                if (!initialized || !localSupabaseClient) {
                    throw new Error('Failed to initialize Supabase client');
                }
            }
            
            // Test connection to Supabase before attempting signup
            try {
                console.log('[Signup] Testing connection to Supabase...');
                const connectionTest = await localSupabaseClient.from('profiles').select('count', { count: 'exact', head: true });
                console.log('[Signup] Connection test result:', connectionTest);
                
                if (connectionTest.error && (connectionTest.error.message?.includes('network') || connectionTest.error.message?.includes('fetch'))) {
                    throw new Error('Network error connecting to database');
                }
            } catch (connErr) {
                console.error('[Signup] Connection test failed:', connErr);
                throw new Error('Failed to connect to the server. Please check your internet connection.');
            }
            
            // Step 1: Create auth user
            console.log('[Signup] Attempting to create user account...');
            const { data: authData, error: authError } = await localSupabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: email.split('@')[0], // Create username from email
                        full_name: document.getElementById('fullName').value,
                        phone: document.getElementById('phone').value,
                        gender: document.getElementById('gender').value,
                        avatar_url: '', // Default empty avatar
                        role: 'user' // Default role
                    }
                }
            });

            if (authError) {
                console.error('[Signup] Auth error:', authError);
                throw authError;
            }
            
            console.log('[Signup] User created successfully:', authData?.user?.id);

            // Update step indicator
            updateStepIndicator(1);

            // Show success message
            showAlert('Sign up successful! Please check your email for verification.', 'success');

            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = '/ngobras.html';
            }, 3000);

        } catch (error) {
            console.error('[Signup] Error during signup process:', error);
            
            // Check for network-related errors
            if (!navigator.onLine || error.message?.includes('network') || error.message?.includes('fetch') ||
                error.message?.includes('connect') || error.message?.includes('internet')) {
                showAlert('Network error. Please check your internet connection and try again.', 'warning');
            }
            // Check for already registered email
            else if (error.message?.toLowerCase().includes('already registered') ||
                     error.message?.toLowerCase().includes('already exists') ||
                     error.message?.toLowerCase().includes('already taken')) {
                showAlert('Email sudah terdaftar. Silakan login atau gunakan email lain.', 'danger');
                
                // Offer to redirect to login page
                const loginRedirect = document.createElement('div');
                loginRedirect.className = 'mt-2';
                loginRedirect.innerHTML = `
                    <button class="btn btn-sm btn-primary" onclick="window.location.href='/login.html?email=${encodeURIComponent(email)}'">
                        Go to Login Page
                    </button>
                `;
                
                // Find the alert we just created and append the button
                const alerts = document.querySelectorAll('.alert-danger');
                if (alerts.length > 0) {
                    alerts[0].appendChild(loginRedirect);
                }
            }
            // Other errors
            else {
                showAlert(error.message || 'Failed to create account. Please try again.', 'danger');
            }
            
            // Reset button state so it can be clicked again
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const password = params.get('password');
    if (email) document.getElementById('email').value = email;
    if (password) document.getElementById('password').value = password;
});

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
    
    const form = document.getElementById('signupForm');
    form.insertBefore(alertDiv, form.firstChild);
    
    // Auto dismiss after 5 seconds for non-error alerts
    if (type !== 'danger' && type !== 'warning') {
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
    
    return alertDiv; // Return the alert div for potential further manipulation
}

// Helper function to update step indicator
function updateStepIndicator(step) {
    const steps = ['step1', 'step2', 'step3'];
    const lines = ['line1', 'line2'];
    
    steps.forEach((stepId, index) => {
        const stepElement = document.getElementById(stepId);
        if (index < step) {
            stepElement.classList.remove('active');
            stepElement.classList.add('completed');
            if (lines[index]) {
                document.getElementById(lines[index]).classList.add('completed');
            }
        } else if (index === step) {
            stepElement.classList.add('active');
        }
    });
}

// Redirect to login page
function showLogin() {
    window.location.href = '/login.html';
}

// Animasi form saat load
window.addEventListener('load', function() {
    const card = document.querySelector('.signup-card');
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
    console.log('[Signup] Network connection restored');
    const networkStatus = document.getElementById('networkStatus');
    if (networkStatus) {
        networkStatus.style.display = 'none';
    } else {
        const onlineAlert = showAlert('Your internet connection has been restored.', 'success');
        setTimeout(() => onlineAlert.remove(), 3000);
    }
});

window.addEventListener('offline', function() {
    console.log('[Signup] Network connection lost');
    
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
        console.log('[Signup] Page loaded in offline state');
        showAlert('You are currently offline. Please check your internet connection.', 'warning');
        
        // Create network status indicator
        const networkStatus = document.createElement('div');
        networkStatus.id = 'networkStatus';
        networkStatus.className = 'network-status-indicator offline';
        networkStatus.innerHTML = '<i class="fas fa-wifi-slash"></i> You are offline. Some features may be unavailable.';
        document.body.appendChild(networkStatus);
    }
});