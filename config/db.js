const mysql = require('mysql2');

let db;

// Detect if running on Railway
const isRailway = process.env.RAILWAY_PRIVATE_DOMAIN !== undefined;

// Use Railway vars if on Railway, else use local DB vars
const host = isRailway ? process.env.RAILWAY_PRIVATE_DOMAIN : process.env.DB_HOST || 'localhost';
const user = isRailway ? process.env.MYSQLUSER : process.env.DB_USER || 'root';
const password = isRailway ? process.env.MYSQLPASSWORD : process.env.DB_PASSWORD || '';
const database = isRailway ? process.env.MYSQLDATABASE : process.env.DB_NAME || 'my_local_db';
const port = process.env.DB_PORT || 3306;

try {
    db = mysql.createConnection({ host, user, password, database, port });

    db.connect(err => {
        if (err) {
            console.error('Database connection failed:', err);
        } else {
            console.log(`Connected to MySQL (${isRailway ? 'Railway' : 'local'})`);
        }
    });
} catch (err) {
    console.error('DB not initialized:', err);
    db = {
        query: (q, params, cb) => {
            console.error('DB query called but DB is not connected.');
            cb(new Error('DB not connected'), null);
        }
    };
}

module.exports = db;