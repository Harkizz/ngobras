// Add safety check at the top
if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded');
    document.body.innerHTML = `
        <div class="alert alert-danger text-center">
            <h4>Application Error</h4>
            <p>Failed to load required libraries. Please refresh the page.</p>
            <button onclick="window.location.reload()" class="btn btn-primary">Refresh</button>
        </div>
    `;
}

const supabaseUrl = "https://vdszykgrgbszuzybmzle.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3p5a2dyZ2JzenV6eWJtemxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODE2NTAsImV4cCI6MjA2NTU1NzY1MH0.XzLkCYEcFOOjFeoFlh6PjZmTxTrg-tblQXST37aIzDk";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

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
            text = 'Password sangat lemah';z
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
            // Update UI to show loading state
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing up...';
            button.disabled = true;
            
            // Step 1: Create auth user
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
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

            if (authError) throw authError;

            // Update step indicator
            updateStepIndicator(1);

            // Show success message
            showAlert('Sign up successful! Please check your email for verification.', 'success');

            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = '/ngobras.html';
            }, 3000);

        } catch (error) {
            console.error('Signup error:', error);
            if (error && error.message && error.message.toLowerCase().includes('already registered')) {
                showAlert('Email sudah terdaftar. Silakan login atau gunakan email lain.', 'danger');
                // Optionally, redirect to login page with email pre-filled:
                // window.location.href = `/login.html?email=${encodeURIComponent(email)}`;
            } else {
                showAlert(error.message || 'Failed to create account', 'danger');
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
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const form = document.getElementById('signupForm');
    form.insertBefore(alertDiv, form.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
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