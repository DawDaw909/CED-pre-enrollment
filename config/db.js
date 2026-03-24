const mysql = require('mysql2');

let db;

try {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
        throw new Error('Missing one or more DB environment variables');
    }

    db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    db.connect((err) => {
        if (err) {
            console.error('Database connection failed:', err);
        } else {
            console.log('Connected to MySQL');
        }
    });

} catch (err) {
    console.error('DB not initialized:', err);
    // Export a dummy object so server routes don’t crash
    db = {
        query: (q, params, cb) => {
            console.error('DB query called but DB is not connected.');
            cb(new Error('DB not connected'), null);
        }
    };
}

module.exports = db;