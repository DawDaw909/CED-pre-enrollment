const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serve all static files

// DB connection
const db = require('./config/db');

// API routes
app.use('/api/students', require('./routes/students'));
app.use('/api/auth', require('./routes/roles'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/admin', require('./routes/admin'));

// Serve frontend for root (login page)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Catch-all for frontend routing (optional if using React/SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));