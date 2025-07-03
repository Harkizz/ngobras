// SupabaseSubscriptionManager.js
// Centralized manager for Supabase realtime subscriptions with environment detection and polling fallback

class SupabaseSubscriptionManager {
    constructor({ getSupabaseClient, fetchMessages, pollingKey = 'messages', pollingOptions = {} }) {
        this.getSupabaseClient = getSupabaseClient;
        this.fetchMessages = fetchMessages;
        this.pollingKey = pollingKey;
        this.pollingOptions = Object.assign({
            interval: 5000,
            exponentialBackoff: true,
            maxInterval: 20000
        }, pollingOptions);
        this.subscriptions = new Map();
        this.pollingIntervalId = null;
        this.isRealtimeEnabled = this.detectRealtimeEnabled();
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.baseRetryDelay = 2000;
        this.cleanupHandlers = [];
    }

    detectRealtimeEnabled() {
        // Disable realtime on Vercel/production, enable on localhost
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
        if (hostname.endsWith('vercel.app')) return false;
        // You can add more production detection logic here
        return false;
    }

    async initialize() {
        this.supabase = await this.getSupabaseClient();
        this.setupConnectionMonitoring();
    }

    setupConnectionMonitoring() {
        if (!this.supabase || !this.supabase.realtime) return;
        try {
            this.supabase.realtime.onOpen(() => {
                this.isConnected = true;
                this.retryCount = 0;
                this.stopPolling();
                console.log('[SubscriptionManager] Realtime connected');
            });
            this.supabase.realtime.onClose(() => {
                this.isConnected = false;
                console.warn('[SubscriptionManager] Realtime disconnected');
                this.handleRealtimeDisconnect();
            });
        } catch (e) {
            // Defensive: not all versions of supabase-js support onOpen/onClose
        }
    }

    async subscribe(channelName, config, callback) {
        if (!this.isRealtimeEnabled) {
            this.startPolling();
            return null;
        }
        if (this.subscriptions.has(channelName)) {
            return this.subscriptions.get(channelName);
        }
        try {
            const channel = this.supabase.channel(channelName)
                .on('postgres_changes', config, callback)
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        this.isConnected = true;
                        this.retryCount = 0;
                        this.stopPolling();
                    }
                });
            this.subscriptions.set(channelName, channel);
            return channel;
        } catch (err) {
            console.error('[SubscriptionManager] Subscription failed, falling back to polling', err);
            this.startPolling();
            return null;
        }
    }

    unsubscribe(channelName) {
        const channel = this.subscriptions.get(channelName);
        if (channel && this.supabase) {
            try {
                this.supabase.removeChannel(channel);
            } catch (e) {}
            this.subscriptions.delete(channelName);
        }
    }

    cleanup() {
        // Remove all subscriptions and polling
        for (const [name, channel] of this.subscriptions.entries()) {
            try {
                this.supabase.removeChannel(channel);
            } catch (e) {}
        }
        this.subscriptions.clear();
        this.stopPolling();
        this.cleanupHandlers.forEach(fn => fn());
        this.cleanupHandlers = [];
    }

    handleRealtimeDisconnect() {
        if (this.retryCount < this.maxRetries) {
            const delay = Math.min(this.baseRetryDelay * Math.pow(2, this.retryCount), 30000);
            this.retryCount++;
            setTimeout(() => {
                this.resubscribeAll();
            }, delay);
        } else {
            this.startPolling();
        }
    }

    async resubscribeAll() {
        // Try to re-initialize and re-subscribe all channels
        try {
            await this.initialize();
            for (const [channelName, { config, callback }] of this.subscriptions.entries()) {
                this.subscribe(channelName, config, callback);
            }
        } catch (e) {
            this.startPolling();
        }
    }

    startPolling() {
        if (this.pollingIntervalId) return;
        let currentInterval = this.pollingOptions.interval;
        let attempts = 0;
        const poll = async () => {
            try {
                await this.fetchMessages();
                attempts = 0;
                currentInterval = this.pollingOptions.interval;
            } catch (e) {
                attempts++;
                if (this.pollingOptions.exponentialBackoff) {
                    currentInterval = Math.min(currentInterval * 1.5, this.pollingOptions.maxInterval);
                }
            }
            this.pollingIntervalId = setTimeout(poll, currentInterval);
        };
        this.pollingIntervalId = setTimeout(poll, currentInterval);
    }

    stopPolling() {
        if (this.pollingIntervalId) {
            clearTimeout(this.pollingIntervalId);
            this.pollingIntervalId = null;
        }
    }
}

// Export to window for global access
window.SupabaseSubscriptionManager = SupabaseSubscriptionManager;
