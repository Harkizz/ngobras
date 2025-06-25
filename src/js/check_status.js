window.addEventListener('DOMContentLoaded', function() {
    // Check for guest session ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    let guestSessionId = urlParams.get('guest');
    if (!guestSessionId) {
        // If not present, generate a random session ID and reload with it
        guestSessionId = crypto.randomUUID();
        window.location.replace(window.location.pathname + '?guest=' + guestSessionId);
        return;
    }
    // Optionally, store guestSessionId in sessionStorage for later use
    sessionStorage.setItem('ngobras_guest_session', guestSessionId);

    // Show loading spinner and "Cek Status" for 3 seconds
    document.getElementById('statusTitle').textContent = 'Cek Status';
    document.getElementById('statusLoading').style.display = 'flex';
    document.getElementById('statusResult').style.display = 'none';

    setTimeout(async function() {
        // Check if admin info exists in localStorage
        const adminId = localStorage.getItem('ngobras_admin_id');
        const adminEmail = localStorage.getItem('ngobras_admin_email');
        if (!adminId || !adminEmail) {
            // Not logged in as admin
            document.getElementById('statusLoading').style.display = 'none';
            const resultDiv = document.getElementById('statusResult');
            resultDiv.textContent = 'Anda bukan admin.';
            resultDiv.classList.remove('success');
            resultDiv.style.display = 'block';
            setTimeout(function() {
                window.location.replace('login_admin.html');
            }, 2000);
            return;
        }
        // Optionally, verify adminId/email with backend (profiles table)
        try {
            const res = await fetch(`/api/profiles/${adminId}`);
            if (!res.ok) throw new Error('Gagal memeriksa status admin');
            const data = await res.json();
            if (data && data.role === 'admin' && data.is_active !== false) {
                // Success: is admin
                document.getElementById('statusLoading').style.display = 'none';
                const resultDiv = document.getElementById('statusResult');
                resultDiv.textContent = 'Anda terverifikasi sebagai admin. Mengalihkan ke dashboard...';
                resultDiv.classList.add('success');
                resultDiv.style.display = 'block';
                setTimeout(function() {
                    window.location.replace('admin.html');
                }, 2000);
            } else {
                document.getElementById('statusLoading').style.display = 'none';
                const resultDiv = document.getElementById('statusResult');
                resultDiv.textContent = 'Anda bukan admin.';
                resultDiv.classList.remove('success');
                resultDiv.style.display = 'block';
                setTimeout(function() {
                    window.location.replace('login_admin.html');
                }, 2000);
            }
        } catch (err) {
            document.getElementById('statusLoading').style.display = 'none';
            const resultDiv = document.getElementById('statusResult');
            resultDiv.textContent = 'Gagal memeriksa status. Silakan login ulang.';
            resultDiv.classList.remove('success');
            resultDiv.style.display = 'block';
            setTimeout(function() {
                window.location.replace('login_admin.html');
            }, 2000);
        }
    }, 3000);
});