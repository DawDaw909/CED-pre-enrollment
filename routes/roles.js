const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(401).json({ message: 'Invalid username or password' });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid username or password' });

        // Create JWT token (optional but useful later)
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });

        // Send JSON response instead of redirect
        res.json({ token, role: user.role });
    });
});

module.exports = router;