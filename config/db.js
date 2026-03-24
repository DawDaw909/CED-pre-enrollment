// db.js
const mysql = require('mysql2');

// Detect environment: Railway sets RAILWAY_ENV=production
const isProd = process.env.RAILWAY_ENV === 'production';

// Pick credentials based on environment
const dbConfig = isProd
  ? {
      host: process.env.MYSQLHOST,       // Railway private host
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT || 3306,
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
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error('Database connection failed:', err);
    } else {
      console.log(`Connected to MySQL (${isProd ? 'Railway' : 'Local'})`);
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