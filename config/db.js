const mysql = require('mysql2');

// Detect if we're running on Railway (production) or locally
const isProduction = process.env.RAILWAY_ENV === 'production';

// Pick the right environment variables
const DB_CONFIG = isProduction
  ? {
      host: process.env.DB_HOST || process.env.MYSQLHOST,
      user: process.env.DB_USER || process.env.MYSQLUSER,
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
      database: process.env.DB_NAME || process.env.MYSQLDATABASE,
      port: process.env.DB_PORT || 3306,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ced_pre_enrollment',
      port: process.env.DB_PORT || 3306,
    };

let db;

try {
  db = mysql.createConnection(DB_CONFIG);

  db.connect((err) => {
    if (err) {
      console.error('Database connection failed:', err);
    } else {
      console.log(`Connected to MySQL (${isProduction ? 'Railway' : 'Local'})`);
    }
  });
} catch (err) {
  console.error('DB not initialized:', err);
  // Export a dummy object so server routes don’t crash
  db = {
    query: (q, params, cb) => {
      console.error('DB query called but DB is not connected.');
      cb(new Error('DB not connected'), null);
    },
  };
}

module.exports = db;