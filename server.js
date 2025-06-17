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
    res.sendFile(path.join(__dirname, 'src', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'sw.js'));
});

// Handle all other routes for PWA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
