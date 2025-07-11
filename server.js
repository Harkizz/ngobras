const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Add body parsing middleware
app.use(express.json({ limit: '10mb' })); // Increase limit to 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure CORS if needed
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const port = process.env.PORT || 3000;

// Initialize Supabase client with connection tracking
console.log('[Supabase] Initializing Supabase client...');
let supabaseInitTime = Date.now();
let supabase = null;

try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.error('[Supabase] ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
        throw new Error('Missing Supabase credentials in environment variables');
    }
    
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
    );
    
    console.log(`[Supabase] Client created in ${Date.now() - supabaseInitTime}ms, testing connection...`);
} catch (err) {
    console.error('[Supabase] Failed to create Supabase client:', err);
}

// Test connection with timeout
const connectionTimeout = setTimeout(() => {
    console.error('[Supabase] Connection test timed out after 5000ms');
}, 5000);

supabase.from('ai_assistant').select('count').single()
    .then(({ count, error }) => {
        clearTimeout(connectionTimeout);
        if (error) {
            console.error('[Supabase] Connection error:', error);
        } else {
            console.log(`[Supabase] Connected successfully in ${Date.now() - supabaseInitTime}ms`);
        }
    })
    .catch(err => {
        clearTimeout(connectionTimeout);
        console.error('[Supabase] Connection test failed:', err);
    });

// Serve static files from src directory
app.use(express.static(path.join(__dirname, 'src')));

// Basic API endpoints
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
});

// Get active AI assistants
app.get('/api/ai-assistants', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('ai_assistant')
            .select(`
                id,
                name,
                model_type,
                api_provider,
                base_prompt,
                temperature,
                max_tokens,
                memory_max
            `)
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ 
                error: 'Database error',
                details: error.message 
            });
        }

        // Map the data to include only necessary information for the frontend
        const assistants = (data || []).map(assistant => ({
            id: assistant.id,
            name: assistant.name,
            model_type: assistant.model_type,
            api_provider: assistant.api_provider,
            base_prompt: assistant.base_prompt,
            memory_max: assistant.memory_max // <-- add this
        }));

        return res.json(assistants);

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});

// Save a new message (admin chat & user chat)
app.post('/api/messages', async (req, res) => {
    const { sender_id, receiver_id, content, chat_type } = req.body;
    if (!sender_id || !receiver_id || !content) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        // Ambil Authorization header jika ada
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        let sbClient = supabase;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const jwt = authHeader.replace('Bearer ', '').trim();
            sbClient = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY,
                { global: { headers: { Authorization: `Bearer ${jwt}` } } }
            );
        }
        // Insert message dengan JWT user (agar lolos RLS)
        const { data, error } = await sbClient
            .from('messages')
            .insert([
                {
                    sender_id,
                    receiver_id,
                    content,
                    chat_type: chat_type || null, // chat_type opsional
                    is_read: false
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('[POST /api/messages] Supabase error:', error);
            return res.status(500).json({ error: 'Database error', details: error.message });
        }
        return res.json(data);
    } catch (err) {
        console.error('[POST /api/messages] Server error:', err);
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get('/api/profiles/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, email, avatar_url')
            .eq('id', userId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.post('/api/admin-login', async (req, res) => {
    const { email, uuid } = req.body;
    if (!email || !uuid) {
        return res.status(400).json({ error: 'Email and UUID are required' });
    }
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, role')
            .eq('email', email)
            .eq('id', uuid)
            .eq('role', 'admin')
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return res.status(401).json({ error: 'Email atau UUID tidak valid' });
        }
        return res.json({ success: true, admin: { id: data.id, email: data.email } });
    } catch (err) {
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
});

app.get('/api/messages/:userId', (req, res) => {
    res.json([
        {
            sender_id: 'ai-bot-id',
            content: 'Hello! How can I help you today?',
            created_at: new Date().toISOString()
        }
    ]);
});

// Add after other API endpoints
app.get('/api/admins', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, email, avatar_url')
            .eq('role', 'admin')
            .eq('is_active', true);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ 
                error: 'Database error',
                details: error.message 
            });
        }

        // Ensure we always return an array
        const admins = Array.isArray(data) ? data : [];
        return res.json(admins);

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});

// Add after /api/admins
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, email, avatar_url')
            .eq('role', 'user')
            .eq('is_active', true);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ 
                error: 'Database error',
                details: error.message 
            });
        }

        // Ensure we always return an array
        const users = Array.isArray(data) ? data : [];
        return res.json(users);

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});

// Add this route before other routes
app.post('/api/chat', async (req, res) => {
    try {
        const { message, assistant_id, memory } = req.body;
        
        if ((!message && !req.body.image) || !assistant_id) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Fetch assistant with all configuration
        const { data: assistant, error } = await supabase
            .from('ai_assistant')
            .select('*')
            .eq('id', assistant_id)
            .eq('is_active', true)
            .single();

        if (error || !assistant) {
            console.error('Database error:', error);
            return res.status(404).json({
                error: 'Assistant not found or inactive'
            });
        }

        // Before using assistant.max_tokens and assistant.temperature:
        const maxTokens = Math.max(1, parseInt(assistant.max_tokens) || 1000);
        const temperature = Math.min(1, Math.max(0, parseFloat(assistant.temperature) || 0.7));

        // Prepare headers based on provider
        const headers = {
            'Content-Type': 'application/json'
        };

        switch (assistant.api_provider) {
            case 'google':
                assistant.endpoint_url = `${assistant.endpoint_url}?key=${assistant.api_key}`;
                delete headers['Authorization'];
                break;
            case 'openai':
                headers['Authorization'] = `Bearer ${assistant.api_key}`;
                break;
            case 'anthropic':
                headers['x-api-key'] = assistant.api_key;
                break;
        }

        // Prepare request body based on provider
        let requestBody;
        switch (assistant.api_provider) {
            case 'openai':
                requestBody = {
                    model: assistant.model_type,
                    messages: [
                        { role: 'system', content: assistant.base_prompt },
                        ...(Array.isArray(memory) ? memory : [{ role: 'user', content: message }])
                    ],
                    temperature: temperature,
                    max_tokens: maxTokens
                };
                break;
            case 'anthropic':
                // For Anthropic, you may need to concatenate memory into a single prompt
                let anthropicPrompt = assistant.base_prompt + '\n\n';
                if (Array.isArray(memory)) {
                    memory.forEach(msg => {
                        anthropicPrompt += (msg.role === 'user' ? 'User: ' : 'Assistant: ') + msg.content + '\n';
                    });
                } else {
                    anthropicPrompt += 'User: ' + message + '\n';
                }
                requestBody = {
                    model: assistant.model_type,
                    messages: [{ role: 'user', content: anthropicPrompt }],
                    max_tokens: assistant.max_tokens
                };
                break;
            case 'google':
    let parts = [];
    // Add base prompt as the first part
    if (assistant.base_prompt) {
        parts.push({ text: assistant.base_prompt });
    }
    // Add all memory as alternating parts
    if (Array.isArray(memory)) {
        memory.forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                parts.push({ text: msg.content });
            }
        });
    }
    // Add the latest user message
    if (message) {
        parts.push({ text: message });
    }
    // Add image part if present
    if (req.body.image && req.body.image.startsWith('data:image/')) {
        const matches = req.body.image.match(/^data:(image\/[a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        }
    }
    requestBody = {
        contents: [{ parts }],
        generationConfig: {
            temperature: assistant.temperature,
            maxOutputTokens: assistant.max_tokens
        }
    };
    break;
            default:
                requestBody = {
                    messages: [{ role: 'user', content: message }],
                    model: assistant.model_type,
                    temperature: assistant.temperature,
                    max_tokens: assistant.max_tokens
                };
        }

        // Log the memory context being sent to the AI provider
        console.log('Sending memory context to AI:', memory);

        // Make API request
        const aiResponse = await fetch(assistant.endpoint_url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!aiResponse.ok) {
            const errorData = await aiResponse.json();
            console.error('AI provider error details:', errorData);
            throw new Error(`AI provider error: ${aiResponse.statusText}\n${JSON.stringify(errorData)}`);
        }

        // Parse response based on provider
        const aiData = await aiResponse.json();
        let responseText;

        switch (assistant.api_provider) {
            case 'openai':
                responseText = aiData.choices[0].message.content;
                break;
            case 'anthropic':
                responseText = aiData.content[0].text;
                break;
            case 'google': {
                // Gemini sometimes returns the whole conversation as one string
                let raw = aiData.candidates[0].content.parts[0].text || '';
                // Split by newlines, filter empty, and try to get only the latest assistant reply
                // Option 1: Split by user/assistant turns (if you use "User:" / "Assistant:" in prompt)
                // Option 2: Otherwise, split by newlines and take the last non-empty paragraph
                let lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                // Heuristic: If lines alternate user/assistant, take only the last assistant reply
                // Otherwise, just return the last paragraph
                responseText = lines.length > 0 ? lines[lines.length - 1] : raw;
                // Or, if you want to return all as separate messages, join with '\n\n'
                // responseText = lines.join('\n\n');
                break;
            }
            default:
                responseText = aiData.text || aiData.message || aiData.content;
        }

        return res.status(200).json({
            reply: responseText,
            assistant: {
                name: assistant.name,
                model_type: assistant.model_type,
                provider: assistant.api_provider
            }
        });

    } catch (error) {
        console.error('Chat error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});

// Enhanced Supabase config endpoint with validation and timing info
app.get('/api/supabase-config', (req, res) => {
    console.log('[API] /api/supabase-config requested from:', req.headers['user-agent']);
    
    // Validate config before sending
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.error('[API] ERROR: Missing Supabase configuration');
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'Supabase configuration is incomplete'
        });
    }
    
    // Send config with timestamp to help debug race conditions
    res.json({
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serverTime: Date.now(),
        serverTimeReadable: new Date().toISOString()
    });
});

// Handle PWA routes
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'src', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(__dirname, 'src', 'sw.js'));
});

// Route handler for PWA
app.get('/ngobras', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'ngobras.html'));
});

// Landing page route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Handle protocol routes
app.get('/check-install', (req, res) => {
    res.json({ 
        installed: req.headers['sec-fetch-mode'] === 'navigate' && 
                  req.headers['sec-fetch-dest'] === 'document'
    });
});

// Add/replace this endpoint
app.get('/api/messages/:userId/:adminId', async (req, res) => {
    const { userId, adminId } = req.params;
    try {
        // Ambil Authorization header jika ada
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        let sbClient = supabase;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const jwt = authHeader.replace('Bearer ', '').trim();
            sbClient = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY,
                { global: { headers: { Authorization: `Bearer ${jwt}` } } }
            );
        }
        // Query messages dua arah (user <-> admin)
        const { data, error } = await sbClient
            .from('messages')
            .select('id, sender_id, receiver_id, content, created_at')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[MESSAGES] Supabase error:', error);
            return res.status(500).json({ error: 'Database error', details: error.message });
        }
        res.json(data);
    } catch (err) {
        console.error('[MESSAGES] Server error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// ===== UNREAD ADMIN MESSAGES ENDPOINT =====
// Endpoint: GET /api/unread-admin-messages
// Header: Authorization: Bearer <access_token>
// Response: { adminId: count, ... }
app.get('/api/unread-admin-messages', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }
        const jwt = authHeader.replace('Bearer ', '').trim();
        if (!jwt) {
            return res.status(401).json({ error: 'JWT token missing' });
        }
        // Create Supabase client with user JWT
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${jwt}` } } }
        );
        // Get user id from JWT (decode)
        let userId;
        try {
            const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
            userId = payload.sub;
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JWT', details: e.message });
        }
        if (!userId) {
            return res.status(400).json({ error: 'User ID not found in JWT' });
        }
        // Query all unread messages for this user
        const { data, error } = await userSupabase
            .from('messages')
            .select('sender_id')
            .eq('receiver_id', userId)
            .eq('is_read', false)
            .not('sender_id', 'is', null);
        if (error) {
            console.error('[UNREAD] Supabase error:', error);
            return res.status(500).json({ error: 'Database error', details: error.message });
        }
        // Group by sender_id in JS
        const result = {};
        (data || []).forEach(row => {
            if (row.sender_id) {
                if (!result[row.sender_id]) result[row.sender_id] = 0;
                result[row.sender_id]++;
            }
        });
        return res.json(result);
    } catch (err) {
        console.error('[UNREAD] Server error:', err);
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
});
// ===== END UNREAD ADMIN MESSAGES ENDPOINT =====

// ===== MARK ADMIN MESSAGES AS READ ENDPOINT =====
// Endpoint: POST /api/messages/mark-read
// Body: { sender_id, receiver_id }
// Header: Authorization: Bearer <user JWT>
app.post('/api/messages/mark-read', async (req, res) => {
    try {
        const { sender_id, receiver_id } = req.body;
        if (!sender_id || !receiver_id) {
            return res.status(400).json({ error: 'Missing sender_id or receiver_id' });
        }
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }
        const jwt = authHeader.replace('Bearer ', '').trim();
        if (!jwt) {
            return res.status(401).json({ error: 'JWT token missing' });
        }
        // Create Supabase client with user JWT
        const userSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${jwt}` } } }
        );
        // Update all messages from sender_id to receiver_id where is_read = false
        const { data, error } = await userSupabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', sender_id)
            .eq('receiver_id', receiver_id)
            .eq('is_read', false)
            .select('id'); // pastikan ambil id pesan yang berhasil diupdate
        if (error) {
            console.error('[MARK-READ] Supabase error:', error);
            return res.status(500).json({ error: 'Database error', details: error.message });
        }
        // Debug: jika updated = 0, kemungkinan besar karena policy SELECT membatasi data yang dikembalikan
        if (!data || data.length === 0) {
            console.warn('[MARK-READ] Tidak ada pesan yang diupdate ATAU policy SELECT membatasi data yang dikembalikan. Cek policy SELECT Supabase.');
        }
        return res.json({ success: true, updated: data ? data.length : 0 });
    } catch (err) {
        console.error('[MARK-READ] Server error:', err);
        return res.status(500).json({ error: 'Server error', details: err.message });
    }
});
// ===== END MARK ADMIN MESSAGES AS READ ENDPOINT =====

// Handle all other routes
app.get('*', (req, res) => {
    // Check if it's a PWA request
    const isPWA = req.headers['sec-fetch-mode'] === 'navigate' && 
                 req.headers['sec-fetch-dest'] === 'document';
    
    // If PWA or specific protocol, serve chat app
    if (isPWA || req.query.action === 'chat') {
        res.sendFile(path.join(__dirname, 'src', 'ngobras.html'));
    } else {
        res.sendFile(path.join(__dirname, 'src', 'index.html'));
    }
});

// Add after require statements
const isDev = process.env.NODE_ENV === 'development';

// Add development middleware - place this before other routes
if (isDev) {
    app.use((req, res, next) => {
        // Set headers to prevent caching in development
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Expires', '-1');
        res.set('Pragma', 'no-cache');
        
        // Clear service worker cache on each request in development
        if (req.url === '/sw.js') {
            res.set('Service-Worker-Allowed', '/');
            res.send(`
                // Development mode - clear cache
                self.addEventListener('install', event => {
                    event.waitUntil(
                        caches.keys().then(cacheNames => {
                            return Promise.all(
                                cacheNames.map(cacheName => caches.delete(cacheName))
                            );
                        })
                    );
                    self.skipWaiting();
                });
            `);
            return;
        }
        next();
    });
}

// Tambahkan sebelum app.listen(...);
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error || !data.user) {
            return res.status(401).json({ error: error?.message || 'Invalid credentials' });
        }
        // Simpan user info ke localStorage di frontend jika perlu
        return res.status(200).json({ user: { id: data.user.id, email: data.user.email } });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/signup', async (req, res) => {
    const { email, password, full_name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        // Sign up user with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error || !data.user) {
            return res.status(400).json({ error: error?.message || 'Signup failed' });
        }
        // Optionally, insert profile data into 'profiles' table
        if (full_name) {
            await supabase.from('profiles').update({ full_name }).eq('id', data.user.id);
        }
        return res.status(201).json({ user: { id: data.user.id, email: data.user.email } });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
