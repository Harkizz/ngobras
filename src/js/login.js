document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (email && password) {
                // Simulasi loading
                const button = e.target.querySelector('.btn-login');
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Masuk...';
                button.disabled = true;
                
                setTimeout(() => {
                    alert('Login berhasil! Redirecting...');
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 1500);
            }
        });

        function showSignup() {
            alert('Akan menampilkan halaman signup');
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