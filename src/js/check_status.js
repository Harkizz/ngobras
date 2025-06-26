export async function checkStatus() {
    window.addEventListener('DOMContentLoaded', async function() {
        // Ambil access_token dan refresh_token dari URL hash
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) {
            document.getElementById('statusLoading').style.display = 'none';
            const resultDiv = document.getElementById('statusResult');
            resultDiv.textContent = 'Akses tidak valid. Silakan login ulang.';
            resultDiv.classList.remove('success');
            resultDiv.style.display = 'block';
            setTimeout(function() {
                window.location.replace('login_admin.html');
            }, 2000);
            return;
        }

        // Ambil config Supabase dari backend
        let config;
        try {
            const resp = await fetch('/api/supabase-config');
            config = await resp.json();
        } catch (e) {
            document.getElementById('statusLoading').style.display = 'none';
            const resultDiv = document.getElementById('statusResult');
            resultDiv.textContent = 'Gagal mengambil konfigurasi Supabase.';
            resultDiv.classList.remove('success');
            resultDiv.style.display = 'block';
            setTimeout(function() {
                window.location.replace('login_admin.html');
            }, 2000);
            return;
        }
        if (!config || !config.url || !config.anonKey) {
            document.getElementById('statusLoading').style.display = 'none';
            const resultDiv = document.getElementById('statusResult');
            resultDiv.textContent = 'Konfigurasi Supabase tidak valid.';
            resultDiv.classList.remove('success');
            resultDiv.style.display = 'block';
            setTimeout(function() {
                window.location.replace('login_admin.html');
            }, 2000);
            return;
        }

        // Inisialisasi Supabase client
        const supabaseClient = supabase.createClient(config.url, config.anonKey);

        // Set session Supabase di browser
        await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        // Dapatkan user dari session
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error || !user) {
            document.getElementById('statusLoading').style.display = 'none';
            const resultDiv = document.getElementById('statusResult');
            resultDiv.textContent = 'Akses tidak valid. Silakan login ulang.';
            resultDiv.classList.remove('success');
            resultDiv.style.display = 'block';
            setTimeout(function() {
                window.location.replace('login_admin.html');
            }, 2000);
            return;
        }

        // Cek role admin di profiles
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .eq('role', 'admin')
            .eq('is_active', true)
            .single();

        if (profile) {
            // Simpan ke localStorage
            localStorage.setItem('ngobras_admin_id', user.id);
            localStorage.setItem('ngobras_admin_email', user.email);
            // Redirect ke admin.html
            window.location.replace('admin.html');
        } else {
            document.getElementById('statusLoading').style.display = 'none';
            const resultDiv = document.getElementById('statusResult');
            resultDiv.textContent = 'Email ini bukan admin.';
            resultDiv.classList.remove('success');
            resultDiv.style.display = 'block';
            setTimeout(function() {
                window.location.replace('login_admin.html');
            }, 2000);
        }
    });
}