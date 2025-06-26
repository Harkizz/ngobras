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

async function initializeSupabase() {
    try {
        await waitForSupabase();
        if (!window.supabaseClient) {
            const response = await fetch('/api/supabase-config');
            const config = await response.json();
            if (window.supabase && config.url && config.anonKey) {
                window.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
            } else {
                throw new Error('Supabase config missing');
            }
        }
        // Check if user is authenticated
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        if (error) throw error;
        if (user) {
            await loadUserProfile(user.id);
        } else {
            // Redirect to login if not authenticated
            window.location.href = '/login.html';
        }
    } catch (error) {
        document.body.innerHTML = '<div class="alert alert-danger text-center"><h4>Application Error</h4><p>Failed to load required libraries. Please refresh the page.</p><button onclick="window.location.reload()" class="btn btn-primary">Refresh</button></div>';
        console.error('Supabase initialization error:', error);
    }
}

// Load user profile
async function loadUserProfile(userId) {
    try {
        showProfileLoading(true);

        // Fetch profile data
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // If profile is missing, treat as not logged in
        if (error && error.code === 'PGRST116') {
            await supabaseClient.auth.signOut();
            showAuthModal();
            return;
        }
        if (error) {
            // Show login modal for any error
            showAuthModal();
            return;
        }
        if (!profile) {
            showAuthModal();
            return;
        }

        // Update UI with profile data
        updateProfileUI(profile);

        // Fetch chat statistics
        const { data: chatStats, error: statsError } = await supabaseClient
            .from('messages')
            .select('created_at')
            .eq('sender_id', userId);

        updateProfileStats(chatStats);

    } catch (error) {
        // Show login modal on error
        showAuthModal();
    } finally {
        showProfileLoading(false);
    }
}

// Update profile UI
function updateProfileUI(profile) {
    // Update basic info
    document.getElementById('profileName').textContent = profile.full_name || 'No Name Set';
    document.getElementById('profileEmail').textContent = profile.email || '';
    
    // Update avatar
    const avatarImg = document.getElementById('profileAvatar');
    if (profile.avatar_url) {
        avatarImg.src = profile.avatar_url;
    }
    
    // Update member since date
    const memberSince = new Date(profile.created_at).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long'
    });
    document.getElementById('profileMemberSince').textContent = `Member since ${memberSince}`;
}

// Update profile statistics
function updateProfileStats(chatStats) {
    if (!chatStats) return;
    
    // Update total chats
    document.getElementById('totalChats').textContent = chatStats.length;
    
    // Update last active
    if (chatStats.length > 0) {
        const lastActive = new Date(Math.max(...chatStats.map(chat => new Date(chat.created_at))));
        document.getElementById('lastActive').textContent = lastActive.toLocaleDateString('id-ID');
    }
}

// Add this function to handle profile updates
async function updateProfile(data) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .update(data)
            .eq('id', supabaseClient.auth.user().id);
            
        if (error) throw error;
        
        showAlert('Profile updated successfully', 'success');
        loadUserProfile(supabaseClient.auth.user().id);
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Failed to update profile', 'danger');
    }
}

// Show/hide loading state
function showProfileLoading(show) {
    document.getElementById('profileLoading').style.display = show ? 'block' : 'none';
    document.getElementById('profileContent').style.display = show ? 'none' : 'block';
}