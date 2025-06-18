const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

console.log('Checking Supabase connection...');
supabase.from('ai_assistant').select('count').single()
    .then(({ count, error }) => {
        if (error) {
            console.error('Supabase connection error:', error);
        } else {
            console.log('Supabase connected successfully');
        }
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
            .select('id, name, model_type, api_provider, base_prompt')
            .eq('is_active', true);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ 
                error: 'Database error',
                details: error.message 
            });
        }

        // Ensure we always return an array
        const assistants = Array.isArray(data) ? data : [];
        return res.json(assistants);

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Server error',
            details: error.message 
        });
    }
});

app.get('/api/profiles/:userId', (req, res) => {
    res.json({
        id: req.params.userId,
        username: 'Test User',
        avatar_url: '/images/default-avatar.png'
    });
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
const isDev = process.env.NODE_ENV !== 'production';

// Add development middleware
if (isDev) {
    app.use((req, res, next) => {
        // Set headers to prevent caching in development
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Expires', '-1');
        res.set('Pragma', 'no-cache');
        next();
    });
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
