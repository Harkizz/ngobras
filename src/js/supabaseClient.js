/**
 * Centralized Supabase client initialization with race condition protection
 * This module provides a singleton Supabase client instance and handles:
 * - Race conditions (multiple simultaneous initialization attempts)
 * - CDN loading timing issues
 * - Consistent error handling
 * - Initialization status tracking
 */

// Initialization state tracking
let supabaseClient = null;
let supabaseInitializing = false;
let supabaseInitialized = false;
let supabaseInitPromise = null;
let initStartTime = 0;
let initEndTime = 0;
let initAttempts = 0;

/**
 * Check if we're running in development mode
 * @returns {boolean} True if in development mode
 */
function isDevelopmentMode() {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1' ||
           window.location.port === '3000' ||
           window.location.port === '5000';
}

/**
 * Get the Supabase client instance, initializing it if necessary
 * @returns {Promise<Object>} Supabase client instance
 */
async function getSupabaseClient() {
    const devMode = isDevelopmentMode();
    console.log(`[SupabaseClient] getSupabaseClient called (initialized=${supabaseInitialized}, initializing=${supabaseInitializing}, devMode=${devMode})`);
    
    // If already initialized, return the client immediately
    if (supabaseInitialized && supabaseClient) {
        console.log('[SupabaseClient] Returning existing initialized client');
        return supabaseClient;
    }
    
    // If initialization is in progress, wait for it to complete
    if (supabaseInitializing && supabaseInitPromise) {
        console.log('[SupabaseClient] Initialization in progress, waiting for completion...');
        return supabaseInitPromise;
    }
    
    // Start initialization
    initAttempts++;
    console.log(`[SupabaseClient] Starting initialization (attempt #${initAttempts})`);
    supabaseInitializing = true;
    initStartTime = Date.now();

    // Declare config in the outer scope for use in all branches
    let config;

    // Create a promise that will resolve with the client
    supabaseInitPromise = (async () => {
        try {
            // Check if Supabase library is loaded
            console.log('[SupabaseClient] Checking Supabase library availability...');
            console.log('[SupabaseClient] window.supabase =', window.supabase);
            console.log('[SupabaseClient] typeof window.supabase =', typeof window.supabase);
            
            if (!window.supabase || typeof window.supabase.createClient !== 'function') {
                console.error('[SupabaseClient] Supabase library not available in window object');
                
                // Log all script elements to debug loading order
                const scripts = document.querySelectorAll('script');
                console.debug('[SupabaseClient] Loaded scripts:', Array.from(scripts).map(s => ({
                    src: s.src || 'inline script',
                    async: s.async,
                    defer: s.defer,
                    loaded: s.readyState === 'complete' || s.readyState === 'loaded'
                })));
                
                // Check if the Supabase script is in the DOM but not loaded yet
                const supabaseScript = Array.from(scripts).find(s => s.src && s.src.includes('supabase'));
                if (supabaseScript) {
                    console.log('[SupabaseClient] Supabase script found but not loaded yet:', supabaseScript);
                }
                
                // Wait for a short time and check again (in case it's still loading)
                console.log('[SupabaseClient] Waiting 1500ms for potential async script loading...');
                await new Promise(resolve => setTimeout(resolve, 1500)); // Increased timeout
                
                console.log('[SupabaseClient] After waiting, window.supabase =', window.supabase);
                if (!window.supabase || typeof window.supabase.createClient !== 'function') {
                    console.error('[SupabaseClient] Supabase library still not available after waiting');
                    throw new Error('Supabase library not loaded. Check if the CDN script is included before this code runs.');
                }
            }
            
            // Log Supabase version if available
            if (window.supabase && window.supabase.VERSION) {
                console.log('[SupabaseClient] Supabase JS version:', window.supabase.VERSION);
            }
            
            // Fetch configuration from backend
            console.log('[SupabaseClient] Fetching configuration from /api/supabase-config');
            const configStartTime = Date.now();
            let response;
            try {
                // Add detailed fetch diagnostics
                console.log('[SupabaseClient] Starting fetch request to /api/supabase-config...');

                // Use more detailed fetch with timeout
                const fetchPromise = fetch('/api/supabase-config');
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Fetch timeout after 5000ms')), 5000)
                );

                response = await Promise.race([fetchPromise, timeoutPromise]);
                console.log(`[SupabaseClient] Fetch response received in ${Date.now() - configStartTime}ms:`, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries([...response.headers.entries()])
                });

                if (!response.ok) {
                    console.error(`[SupabaseClient] Failed to fetch config: ${response.status} ${response.statusText}`);
                    throw new Error(`Failed to fetch Supabase configuration: ${response.status} ${response.statusText}`);
                }

                // Try to parse the response as JSON with error handling
                try {
                    const text = await response.text();
                    console.log('[SupabaseClient] Raw response text:', text);
                    config = JSON.parse(text);
                } catch (parseError) {
                    console.error('[SupabaseClient] Failed to parse JSON response:', parseError);
                    throw new Error(`Failed to parse Supabase configuration: ${parseError.message}`);
                }

                console.log(`[SupabaseClient] Configuration received in ${Date.now() - configStartTime}ms:`, config);

                // Validate configuration
                if (!config || !config.url || !config.anonKey) {
                    console.error('[SupabaseClient] Invalid configuration:', config);
                    throw new Error('Invalid Supabase configuration: missing url or anonKey');
                }

                // Log the configuration values (partially masked for security)
                console.log('[SupabaseClient] Config URL:', config.url);
                console.log('[SupabaseClient] Config anonKey:',
                    config.anonKey ? `${config.anonKey.substring(0, 10)}...${config.anonKey.substring(config.anonKey.length - 5)}` : 'undefined');
            } catch (fetchError) {
                // Enhanced error diagnostics for fetch failures
                const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
                let swState = 'unknown';
                if ('serviceWorker' in navigator) {
                    try {
                        swState = navigator.serviceWorker.controller ? 'active' : 'none';
                    } catch (e) {
                        swState = 'error';
                    }
                }
                console.error('[SupabaseClient] Error fetching configuration:', fetchError, {
                    isOffline,
                    swState,
                    location: window.location.href,
                    userAgent: navigator.userAgent
                });

                // Show user-friendly error if in main app context
                if (typeof window !== 'undefined' && document && document.body) {
                    let errorDiv = document.getElementById('supabase-config-error');
                    if (!errorDiv) {
                        errorDiv = document.createElement('div');
                        errorDiv.id = 'supabase-config-error';
                        errorDiv.style.position = 'fixed';
                        errorDiv.style.top = '0';
                        errorDiv.style.left = '0';
                        errorDiv.style.right = '0';
                        errorDiv.style.background = '#ffb3b3';
                        errorDiv.style.color = '#2C3E50';
                        errorDiv.style.padding = '12px 24px';
                        errorDiv.style.zIndex = '3000';
                        errorDiv.style.fontWeight = 'bold';
                        errorDiv.style.textAlign = 'center';
                        errorDiv.innerHTML = 'Gagal mengambil konfigurasi Supabase. Silakan cek koneksi internet Anda atau hubungi admin.';
                        document.body.appendChild(errorDiv);
                    }
                }

                // Fallback to hardcoded values for development/testing
                console.log('[SupabaseClient] Attempting to use fallback configuration...');

                // Check if we have environment variables in .env file
                const fallbackUrl = 'https://vdszykgrgbszuzybmzle.supabase.co';
                const fallbackAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkc3p5a2dyZ2JzenV6eWJtemxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODE2NTAsImV4cCI6MjA2NTU1NzY1MH0.XzLkCYEcFOOjFeoFlh6PjZmTxTrg-tblQXST37aIzDk';

                config = {
                    url: fallbackUrl,
                    anonKey: fallbackAnonKey,
                    isFallback: true
                };

                if (!config.url || !config.anonKey) {
                    throw new Error('Fallback Supabase configuration is missing url or anonKey');
                }

                console.log('[SupabaseClient] Using fallback configuration with URL:', fallbackUrl);
                console.log('[SupabaseClient] Fallback configuration created');
            }
            
            // Create the client
            console.log('[SupabaseClient] Creating Supabase client with config');
            try {
                if (!config || !config.url || !config.anonKey) {
                    throw new Error('Invalid config object: ' + JSON.stringify(config));
                }

                const url = config.url;
                const anonKey = config.anonKey;

                console.log('[SupabaseClient] Creating client with URL:', url);
                console.log('[SupabaseClient] Creating client with anonKey:', anonKey.substring(0, 10) + '...');

                supabaseClient = window.supabase.createClient(url, anonKey);
                console.log('[SupabaseClient] Supabase client created:', supabaseClient);

                // Log available methods on the client
                console.log('[SupabaseClient] Available methods:', Object.getOwnPropertyNames(
                    Object.getPrototypeOf(supabaseClient)).filter(m => typeof supabaseClient[m] === 'function')
                );

                // Validate the client
                if (!supabaseClient) {
                    throw new Error('Supabase client is null or undefined');
                }

                console.log('[SupabaseClient] Client methods check:');
                console.log('- from method:', typeof supabaseClient.from);
                console.log('- auth method:', typeof supabaseClient.auth);
                console.log('- channel method:', typeof supabaseClient.channel);

                if (typeof supabaseClient.from !== 'function' || typeof supabaseClient.channel !== 'function') {
                    throw new Error('Failed to create valid Supabase client - missing required methods');
                }
            } catch (clientError) {
                console.error('[SupabaseClient] Error creating Supabase client:', clientError);
                throw clientError;
            }
            
            // Test connection
            console.log('[SupabaseClient] Testing connection...');
            try {
                const connectionStartTime = Date.now();
                const { data, error, status, statusText } = await supabaseClient.from('profiles').select('count', { count: 'exact', head: true });
                
                console.log(`[SupabaseClient] Connection test completed in ${Date.now() - connectionStartTime}ms`);
                console.log('[SupabaseClient] Connection test result:', { data, error, status, statusText });
                
                if (error) {
                    console.warn('[SupabaseClient] Connection test returned error:', error);
                    // Continue anyway, as this might be a permissions issue rather than a connection issue
                } else {
                    console.log('[SupabaseClient] Connection test successful');
                }
            } catch (connectionError) {
                console.error('[SupabaseClient] Connection test threw exception:', connectionError);
                // Continue anyway, but log the error
            }
            
            // Mark as initialized
            supabaseInitialized = true;
            initEndTime = Date.now();
            console.log(`[SupabaseClient] Initialization completed in ${initEndTime - initStartTime}ms`);
            
            // Make client available globally for legacy code
            window.supabaseClient = supabaseClient;
            
            return supabaseClient;
        } catch (error) {
            console.error('[SupabaseClient] Initialization failed:', error);
            supabaseClient = null;
            supabaseInitialized = false;
            throw error;
        } finally {
            supabaseInitializing = false;
        }
    })();
    
    return supabaseInitPromise;
}

/**
 * Check if Supabase is initialized
 * @returns {boolean} True if Supabase is initialized
 */
function isSupabaseInitialized() {
    return supabaseInitialized && supabaseClient !== null;
}

/**
 * Get initialization status details
 * @returns {Object} Initialization status details
 */
function getInitStatus() {
    return {
        initialized: supabaseInitialized,
        initializing: supabaseInitializing,
        initStartTime,
        initEndTime,
        initDuration: initEndTime > 0 ? (initEndTime - initStartTime) : null,
        attempts: initAttempts
    };
}

// Export functions
window.getSupabaseClient = getSupabaseClient;
window.isSupabaseInitialized = isSupabaseInitialized;
window.getSupabaseInitStatus = getInitStatus;