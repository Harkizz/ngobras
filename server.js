const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from src directory
app.use(express.static(path.join(__dirname, 'src')));

// Basic API endpoints
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
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

// Handle all other routes
app.get('*', (req, res) => {
    // If request is from installed PWA, redirect to ngobras.html
    if (req.headers['sec-fetch-mode'] === 'navigate' && req.headers['sec-fetch-dest'] === 'document') {
        res.sendFile(path.join(__dirname, 'src', 'ngobras.html'));
    } else {
        res.sendFile(path.join(__dirname, 'src', 'index.html'));
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
