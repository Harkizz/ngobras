/**
 * NGOBRAS - Profile Management Module
 * 
 * This module handles all profile-related functionality including:
 * - Profile page display and navigation
 * - Account details modal
 * - Secure logout process
 * - User data management
 */

// Use IIFE pattern to avoid polluting global scope while still making necessary functions available
(function() {
    'use strict';
    
    // ===== PROFILE INITIALIZATION =====
    
    /**
     * Initialize profile functionality
     * Called when profile page is loaded or activated
     */
    function initializeProfile() {
        try {
            console.log('[NGOBRAS_PROFILE] Initializing profile page');
            
            // Get user data from Supabase session
            const userData = getUserData();
            
            if (!userData) {
                console.error('[NGOBRAS_PROFILE] No user data found. Redirecting to login...');
                redirectToLogin();
                return;
            }
            
            // Render profile content
            renderProfileContent(userData);
            
            // Add event listeners for profile actions
            setupProfileEventListeners();
        } catch (error) {
            // Detailed error logging
            console.error('[NGOBRAS_PROFILE] Error initializing profile:', error.name);
            console.error('[NGOBRAS_PROFILE] Error message:', error.message);
            console.error('[NGOBRAS_PROFILE] Stack trace:', error.stack);
            console.error('[NGOBRAS_PROFILE] Context:', {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                location: window.location.href
            });
            
            // Show error message to user
            showErrorMessage('Failed to initialize profile. Please try refreshing the page.');
        }
    }
    
    /**
     * Get user data from Supabase session
     * @returns {Object|null} User data object or null if not logged in
     */
    function getUserData() {
        try {
            // Get session from localStorage using the global function
            const session = window.getUserSessionFromLocalStorage ? 
                window.getUserSessionFromLocalStorage() : null;
            
            if (!session || !session.user) {
                console.error('[NGOBRAS_PROFILE] No valid session found');
                return null;
            }
            
            return {
                id: session.user.id,
                email: session.user.email,
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                fullName: session.user.user_metadata?.full_name || '',
                gender: session.user.user_metadata?.gender || 'Not specified',
                avatarUrl: session.user.user_metadata?.avatar_url || '/images/default-avatar.png'
            };
        } catch (error) {
            console.error('[NGOBRAS_PROFILE] Error getting user data:', error);
            return null;
        }
    }
    
    // ===== PROFILE UI RENDERING =====
    
    /**
     * Render the profile page content
     * @param {Object} userData - User data object
     */
    function renderProfileContent(userData) {
        try {
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) {
                console.error('[NGOBRAS_PROFILE] Main content container not found');
                return;
            }
            const profileHTML = `
                <div class="profile-container fade-in">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <img src="${userData.avatarUrl}" alt="${userData.username}" onerror="this.src='/images/default-avatar.png'">
                        </div>
                        <h2 class="profile-name">${userData.fullName || userData.username}</h2>
                        <p class="profile-email">${userData.email}</p>
                    </div>
                    <div class="profile-menu">
                        <div class="profile-menu-item" id="account-details-btn">
                            <i class="bi bi-person-badge"></i>
                            <span>Account Details</span>
                            <i class="bi bi-chevron-right"></i>
                        </div>
                        <div class="profile-menu-item" id="logout-btn">
                            <i class="bi bi-box-arrow-right"></i>
                            <span>Logout</span>
                            <i class="bi bi-chevron-right"></i>
                        </div>
                    </div>
                </div>
            `;
            mainContent.innerHTML = profileHTML;
        } catch (error) {
            console.error('[NGOBRAS_PROFILE] Error rendering profile content:', error);
            showErrorMessage('Failed to display profile content.');
        }
    }

    /**
     * Create and show the account details modal
     * @param {Object} userData - User data object
     */
    function showAccountDetailsModal() {
        try {
            // Remove any existing modal first
            const oldModal = document.getElementById('account-details-modal');
            if (oldModal) oldModal.remove();
            const userData = getUserData();
            const modalHTML = `
                <div class="account-details-modal" id="account-details-modal" aria-modal="true" tabindex="-1" style="display:flex;">
                    <div class="account-details-backdrop"></div>
                    <div class="account-details-content">
                        <div class="account-details-header">
                            <h2>Account Details</h2>
                            <button class="close-modal-btn" id="close-account-modal" aria-label="Close">&times;</button>
                        </div>
                        <div class="account-details-body">
                            <div class="account-detail-item"><label>Email</label><p>${userData.email}</p></div>
                            <div class="account-detail-item"><label>Username</label><p>${userData.username}</p></div>
                            <div class="account-detail-item"><label>Full Name</label><p>${userData.fullName || 'Not provided'}</p></div>
                            <div class="account-detail-item"><label>Password</label><p class="masked-password">********</p></div>
                            <div class="account-detail-item"><label>Gender</label><p>${userData.gender}</p></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            document.getElementById('close-account-modal').addEventListener('click', closeAccountDetailsModal);
            document.querySelector('.account-details-backdrop').addEventListener('click', closeAccountDetailsModal);
        } catch (error) {
            console.error('[NGOBRAS_PROFILE] Error showing account details modal:', error);
            showToast('Failed to display account details. Please try again.', 'error');
        }
    }

    /**
     * Close the account details modal
     */
    function closeAccountDetailsModal() {
        try {
            const modal = document.getElementById('account-details-modal');
            if (!modal) return;
            modal.remove();
        } catch (error) {
            console.error('[NGOBRAS_PROFILE] Error closing account details modal:', error);
            const modal = document.getElementById('account-details-modal');
            if (modal) modal.remove();
        }
    }
    
    // ===== EVENT LISTENERS =====
    
    /**
     * Set up event listeners for profile actions
     */
    function setupProfileEventListeners() {
        try {
            const accountDetailsBtn = document.getElementById('account-details-btn');
            if (accountDetailsBtn) {
                accountDetailsBtn.addEventListener('click', showAccountDetailsModal);
            }
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    if (confirm('Are you sure you want to logout?')) {
                        logoutUser();
                    }
                });
            }
        } catch (error) {
            console.error('[NGOBRAS_PROFILE] Error setting up event listeners:', error);
        }
    }
    
    // ===== AUTHENTICATION FUNCTIONS =====
    
    /**
     * Log out the current user
     * Clears session data and redirects to login page
     */
    function logoutUser() {
        try {
            console.log('[NGOBRAS_PROFILE] Logging out user...');
            
            // Get Supabase client if available
            if (typeof window.getSupabaseClient === 'function') {
                window.getSupabaseClient().then(function(supabase) {
                    if (supabase && supabase.auth) {
                        // Sign out using Supabase client
                        supabase.auth.signOut().then(function() {
                            console.log('[NGOBRAS_PROFILE] Supabase signOut successful');
                            completeLogout();
                        }).catch(function(error) {
                            console.error('[NGOBRAS_PROFILE] Supabase signOut error:', error);
                            // Continue with manual logout even if Supabase fails
                            completeLogout();
                        });
                    } else {
                        completeLogout();
                    }
                }).catch(function(error) {
                    console.error('[NGOBRAS_PROFILE] Error getting Supabase client:', error);
                    completeLogout();
                });
            } else {
                completeLogout();
            }
        } catch (error) {
            console.error('[NGOBRAS_PROFILE] Error during logout:', error);
            showToast('Error during logout. Please try again.', 'error');
        }
    }
    
    /**
     * Complete the logout process by clearing local storage and redirecting
     */
    function completeLogout() {
        try {
            // Clear any auth tokens from localStorage as fallback
            const authTokenKey = Object.keys(localStorage).find(function(k) { 
                return k.endsWith('-auth-token'); 
            });
            
            if (authTokenKey) {
                localStorage.removeItem(authTokenKey);
            }
            
            // Clear any other app-specific data
            localStorage.removeItem('ngobras-user-data');
            
            // Show success message
            showToast('Logout successful', 'success');
            
            // Redirect to login page
            setTimeout(function() {
                redirectToLogin();
            }, 1000);
        } catch (error) {
            console.error('[NGOBRAS_PROFILE] Error completing logout:', error);
            // Force redirect on error
            redirectToLogin();
        }
    }
    
    /**
     * Redirect to login page
     */
    function redirectToLogin() {
        window.location.href = 'login.html';
    }
    
    // ===== UTILITY FUNCTIONS =====
    
    /**
     * Show toast notification
     * Uses the existing showToast function from ngobras.js if available
     * @param {string} message - Message to display
     * @param {string} type - Type of toast (success, error, info)
     */
    function showToast(message, type) {
        type = type || 'info';
        // Check if global showToast function exists
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Fallback implementation
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(message);
        }
    }
    
    /**
     * Show error message in the main content area
     * @param {string} message - Error message to display
     */
    function showErrorMessage(message) {
        try {
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="error-container" style="text-align: center; padding: 2rem;">
                        <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: var(--secondary-color);"></i>
                        <h3>Profile Error</h3>
                        <p>${message}</p>
                        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-color); border: none; border-radius: 4px; cursor: pointer;">
                            Refresh Page
                        </button>
                    </div>
                `;
            }
            
            // Also show toast if available
            showToast(message, 'error');
        } catch (error) {
            console.error('[NGOBRAS_PROFILE] Error showing error message:', error);
            // Last resort fallback
            alert(message);
        }
    }
    
    // ===== INTEGRATION WITH MAIN APP =====
    
    /**
     * Handler for profile page navigation
     * Called from ngobras.js when user navigates to profile page
     */
    function handleProfilePage() {
        initializeProfile();
    }
    
    // Export functions to global scope for use in ngobras.js
    window.handleProfilePage = handleProfilePage;
    
})(); // End of IIFE