const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

// Get teacher's own profile and assigned subjects
router.get('/me', protect, restrictTo('teacher'), (req, res) => {
    const sql = `
        SELECT t.id, t.first_name, t.last_name, t.email,
               d.name as department_name
        FROM teachers t
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.user_id = ?
    `;
    db.query(sql, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (results.length === 0) return res.status(404).json({ message: 'Teacher not found' });

        const teacher = results[0];

        const subjectsSQL = `
            SELECT s.id, s.code, s.name, s.units
            FROM teacher_subjects ts
            JOIN subjects s ON ts.subject_id = s.id
            WHERE ts.teacher_id = ?
        `;
        db.query(subjectsSQL, [teacher.id], (err, subjects) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });
            res.json({ teacher, subjects });
        });
    });
});

// Get students enrolled in a specific subject
router.get('/subject/:subject_id/students', protect, restrictTo('teacher'), (req, res) => {
    const sql = `
        SELECT st.id, st.student_number, st.first_name, st.last_name,
               st.year_level, st.course,
               e.school_year, e.semester,
               g.grade, g.passed
        FROM enrollments e
        JOIN students st ON e.student_id = st.id
        LEFT JOIN grades g ON g.student_id = st.id 
            AND g.subject_id = e.subject_id
            AND g.school_year = e.school_year
            AND g.semester = e.semester
        WHERE e.subject_id = ?
        ORDER BY st.last_name, st.first_name
    `;
    db.query(sql, [req.params.subject_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results);
    });
});

// Submit or update a grade
router.post('/grade', protect, restrictTo('teacher'), (req, res) => {
    const { student_id, subject_id, grade, school_year, semester } = req.body;

    if (!student_id || !subject_id || grade === undefined || !school_year || !semester) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const numericGrade = parseFloat(grade);
    const passed = numericGrade >= 1.0 && numericGrade <= 4.0 ? 1 : 0;

    const sql = `
        INSERT INTO grades (student_id, subject_id, grade, passed, school_year, semester)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE grade = VALUES(grade), passed = VALUES(passed)
    `;

    db.query(sql, [student_id, subject_id, numericGrade, passed, school_year, semester], (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json({
            message: 'Grade submitted successfully.',
            passed: passed === 1 ? 'Passed' : 'Failed',
            grade: numericGrade
        });
    });
});

// Get all teachers (admin only)
router.get('/all', protect, restrictTo('admin'), (req, res) => {
    const sql = `
        SELECT t.id, t.first_name, t.last_name, t.email,
               d.name as department_name,
               u.username
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        ORDER BY t.last_name
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results);
    });
});

module.exports = router;