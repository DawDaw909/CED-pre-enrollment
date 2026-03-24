const mysql = require('mysql2');

// Use .env.local locally, Railway will automatically provide env variables
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ced_preenrollment',
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) console.error('MySQL connection FAILED:', err);
  else console.log('Connected to MySQL');
});

module.exports = db;