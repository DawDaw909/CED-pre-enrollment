const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = require('./config/db');

const studentRoutes = require('./routes/students');
app.use('/api/students', studentRoutes);

const roleRoutes = require('./routes/roles');
app.use('/api/auth', roleRoutes);

const teacherRoutes = require('./routes/teachers');
app.use('/api/teachers', teacherRoutes);

app.get('/', (req, res) => {
    res.send('CED Pre-enrollment System API Running');
});

app.listen(5000, () => {
    console.log('Server running on port 5000');
});