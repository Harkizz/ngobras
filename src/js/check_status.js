window.addEventListener('DOMContentLoaded', async function() {
    // Ambil access_token dari URL hash
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const accessToken = params.get('access_token');
    if (!accessToken) {
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

    // Inisialisasi Supabase client (ganti dengan config Anda)
    const supabaseUrl = 'https://vdszykgrgbszuzybmzle.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3p5a2dyZ2JzenV6eWJtemxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODE2NTAsImV4cCI6MjA2NTU1NzY1MH0.XzLkCYEcFOOjFeoFlh6PjZmTxTrg-tblQXST37aIzDk';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

    // Set session dengan access token
    const { data: { user }, error } = await supabaseClient.auth.getUser(accessToken);
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
        // Redirect ke admin.html/(id admin)
        window.location.replace('admin.html/' + user.id);
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
