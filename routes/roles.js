const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }

    // Look for the user in the database
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            console.error('DB error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = results[0];

        // Compare hashed password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Login successful → create a JWT token
        const token = jwt.sign(
            { username: user.username, role: user.role },
            'your_secret_key', // <-- replace with a real secret in production
            { expiresIn: '1h' }
        );

        // Send token + role as JSON (frontend handles redirection)
        res.json({ token, role: user.role });
    });
});

module.exports = router;