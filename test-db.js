require('dotenv').config(); // must be first
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

db.connect(err => {
    if (err) {
        console.error('Railway DB connection FAILED:', err);
    } else {
        console.log('Connected to DB successfully!');
        // Optional: test a query
        db.query('SELECT NOW() AS currentTime', (err, results) => {
            if (err) console.error(err);
            else console.log('DB responded:', results);
            db.end(); // close connection
        });
    }
});