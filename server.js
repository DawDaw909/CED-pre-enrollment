const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// -------------------- Middleware --------------------
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static HTML/CSS/JS/images

// -------------------- DB Connection --------------------
try {
    const db = require('./config/db'); 
    console.log('DB module loaded');
} catch (err) {
    console.error('DB connection failed or missing. Continuing without DB.', err);
}

// -------------------- API Routes --------------------
try { app.use('/api/auth', require('./routes/roles')); } 
catch(err) { console.error('Failed to load auth route:', err); }

try { app.use('/api/students', require('./routes/students')); } 
catch(err) { console.error('Failed to load students route:', err); }

try { app.use('/api/teachers', require('./routes/teachers')); } 
catch(err) { console.error('Failed to load teachers route:', err); }

try { app.use('/api/admin', require('./routes/admin')); } 
catch(err) { console.error('Failed to load admin route:', err); }

// -------------------- Frontend Routes --------------------
// Serve login page at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});