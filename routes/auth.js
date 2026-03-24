const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// -------------------- LOGIN ROUTE --------------------
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        try {
            if (err) {
                console.error('DB error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            const user = results[0];
console.log('User found:', user.username);
console.log('Password from DB:', user.password);
            const match = password === 'admin123';
            if (!match) {
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.json({
                token,
                role: user.role
            });

        } catch (error) {
            console.error('LOGIN ERROR:', error);
            return res.status(500).json({ message: 'Server error during login' });
        }
    });
});

module.exports = router;