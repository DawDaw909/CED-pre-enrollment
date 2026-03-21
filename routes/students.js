const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, restrictTo } = require('../middleware/auth');

router.post('/new', protect, restrictTo('admin'), (req, res) => {
    const { student_number, first_name, last_name, age, address, department_id, course, year_level, type} = req.body;

    const insertStudent = `INSERT INTO students 
        (student_number, first_name, last_name, age, address, department_id, course, year_level, type) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(insertStudent, [student_number, first_name, last_name, age, address, department_id, course, year_level, type], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error', error: err });
        }

        const student_id = result.insertId;

        // If shiftee — skip auto enroll, create f2f notice instead
if (type === 'shiftee') {
    const noticeSQL = `INSERT INTO notices (student_id, type, message) VALUES (?, 'f2f_required', ?)`;
    const msg = `Shiftee student ${first_name} ${last_name} requires face-to-face consultation with advisor before enrollment can proceed.`;
    db.query(noticeSQL, [student_id, msg], (err) => {
        if (err) console.error(err);
    });

    const bcrypt = require('bcrypt');
    bcrypt.hash(student_number, 10, (err, hash) => {
        if (err) console.error(err);
        const userSQL = `INSERT INTO users (username, password, role, student_id) VALUES (?, ?, 'student', ?)`;
        db.query(userSQL, [student_number, hash, student_id], (err) => {
            if (err) console.error(err);
            res.status(201).json({
                message: 'Shiftee registered. Face-to-face consultation required before enrollment.',
                student_id
            });
        });
    });
    return;
}

const curriculumSQL = `
    SELECT s.id as subject_id, s.units, s.code, s.name
    FROM curriculum c
    JOIN subjects s ON c.subject_id = s.id
    WHERE c.department_id = ? AND c.year_level = ? AND c.semester = 1
`;

db.query(curriculumSQL, [department_id, year_level], (err, subjects) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching curriculum', error: err });
    }

    if (subjects.length === 0) {
        return res.status(201).json({
            message: 'Student registered but no curriculum found for this department/year.',
            student_id
        });
    }

    const currentYear = new Date().getFullYear();
    const school_year = `${currentYear}-${currentYear + 1}`;

    const enrollmentValues = subjects.map(sub => [student_id, sub.subject_id, school_year, 1, 'auto_enrolled']);

    const enrollSQL = `INSERT INTO enrollments (student_id, subject_id, school_year, semester, status) VALUES ?`;

    db.query(enrollSQL, [enrollmentValues], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error auto-enrolling subjects', error: err });
        }

        const bcrypt = require('bcrypt');
        bcrypt.hash(student_number, 10, (err, hash) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error creating user account', error: err });
            }

            const userSQL = `INSERT INTO users (username, password, role, student_id) VALUES (?, ?, 'student', ?)`;
            db.query(userSQL, [student_number, hash, student_id], (err) => {
                if (err) console.error(err);

                const enrolledSubjects = subjects.map(s => `${s.code} - ${s.name}`);

                res.status(201).json({
                    message: 'Student registered and auto-enrolled successfully',
                    student_id,
                    school_year,
                    enrolled_subjects: enrolledSubjects
                });
            });
        });
    });
});
    });
});


router.get('/all', protect, restrictTo('admin', 'business_office'), (req, res) => {
    const sql = `
        SELECT s.id, s.student_number, s.first_name, s.last_name, 
               s.course, s.year_level, s.type, s.status, s.ok_to_enroll,
               d.name as department_name
        FROM students s
        JOIN departments d ON s.department_id = d.id
        ORDER BY s.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results);
    });
});

// Student views their own profile and enrollments
router.get('/me', protect, restrictTo('student'), (req, res) => {
    const userSQL = `
        SELECT s.id, s.student_number, s.first_name, s.last_name,
               s.course, s.year_level, s.type, s.status, s.ok_to_enroll,
               d.name as department_name
        FROM students s
        JOIN departments d ON s.department_id = d.id
        JOIN users u ON u.student_id = s.id
        WHERE u.id = ?
    `;
    db.query(userSQL, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (results.length === 0) return res.status(404).json({ message: 'Student not found' });

        const student = results[0];

        const enrollSQL = `
            SELECT s.code, s.name, s.units, s.type, e.status, e.school_year, e.semester
            FROM enrollments e
            JOIN subjects s ON e.subject_id = s.id
            WHERE e.student_id = ?
            ORDER BY e.semester, s.code
        `;
        db.query(enrollSQL, [student.id], (err, subjects) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });

            const noticeSQL = `SELECT * FROM notices WHERE student_id = ? AND resolved = 0`;
            db.query(noticeSQL, [student.id], (err, notices) => {
                if (err) return res.status(500).json({ message: 'Database error', error: err });
                res.json({ student, subjects, notices });
            });
        });
    });
});

// Get one student's enrolled subjects
router.get('/:id/enrollments', protect, restrictTo('admin'), (req, res) => {
    const sql = `
        SELECT s.code, s.name, s.units, s.type, e.status, e.school_year, e.semester
        FROM enrollments e
        JOIN subjects s ON e.subject_id = s.id
        WHERE e.student_id = ?
        ORDER BY e.semester, s.code
    `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results);
    });
});

// Get all departments (for the register form dropdown)
router.get('/departments', protect, restrictTo('admin'), (req, res) => {
    db.query('SELECT * FROM departments', (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results);
    });
});

// Get student by ID or name (for business office search)
router.get('/search', protect, restrictTo('business_office'), (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: 'Search query required' });

    const sql = `
        SELECT s.id, s.student_number, s.first_name, s.last_name,
               s.course, s.year_level, s.type, s.ok_to_enroll,
               d.name as department_name
        FROM students s
        JOIN departments d ON s.department_id = d.id
        WHERE s.student_number LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?
    `;
    const like = `%${query}%`;
    db.query(sql, [like, like, like], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results);
    });
});

// Confirm payment — flip ok_to_enroll to 1
router.patch('/:id/confirm-payment', protect, restrictTo('business_office'), (req, res) => {
    const sql = `UPDATE students SET ok_to_enroll = 1 WHERE id = ?`;
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Payment confirmed. Student cleared for enrollment.' });
    });
});

// Get enrollment status
router.get('/enrollment-status', protect, (req, res) => {
    db.query('SELECT * FROM enrollment_settings ORDER BY id DESC LIMIT 1', (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (results.length === 0) return res.json({ is_open: 0 });
        res.json(results[0]);
    });
});

// Toggle enrollment open/closed (admin only)
router.patch('/enrollment-settings', protect, restrictTo('admin'), (req, res) => {
    const { is_open, school_year, semester } = req.body;
    const sql = `UPDATE enrollment_settings SET is_open = ?, school_year = ?, semester = ? ORDER BY id DESC LIMIT 1`;
    db.query(sql, [is_open, school_year, semester], (err) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json({ message: `Enrollment ${is_open ? 'opened' : 'closed'} successfully.` });
    });
});


// Old student begins enrollment
router.post('/enroll-old', protect, restrictTo('student'), (req, res) => {
    const userId = req.user.id;

    db.query('SELECT * FROM enrollment_settings ORDER BY id DESC LIMIT 1', (err, settings) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (!settings[0] || !settings[0].is_open) {
            return res.status(403).json({ message: 'Enrollment is currently closed.' });
        }

        const { school_year, semester } = settings[0];

        const studentSQL = `
            SELECT s.* FROM students s
            JOIN users u ON u.student_id = s.id
            WHERE u.id = ?
        `;
        db.query(studentSQL, [userId], (err, students) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });
            const student = students[0];

            if (!student.ok_to_enroll) {
                return res.status(403).json({ message: 'You are not cleared for enrollment. Please settle your balance at the Business Office.' });
            }

            db.query(
                'SELECT id FROM enrollments WHERE student_id = ? AND school_year = ? AND semester = ? LIMIT 1',
                [student.id, school_year, semester],
                (err, existing) => {
                    if (err) return res.status(500).json({ message: 'Database error', error: err });
                    if (existing.length > 0) {
                        return res.status(400).json({ message: 'You are already enrolled for this semester.' });
                    }

                    db.query(
                        'SELECT subject_id, grade FROM grades WHERE student_id = ?',
                        [student.id],
                        (err, grades) => {
                            if (err) return res.status(500).json({ message: 'Database error', error: err });

                            const passingThreshold = student.year_level >= 3 ? 1.8 : 2.0;

                            const passedSubjectIds = new Set(
                                grades.filter(g => g.grade >= passingThreshold).map(g => g.subject_id)
                            );
                            const failedSubjectIds = new Set(
                                grades.filter(g => g.grade < passingThreshold).map(g => g.subject_id)
                            );
                            const isRegular = failedSubjectIds.size === 0;

                            db.query(
                                'UPDATE students SET status = ?, type = "old" WHERE id = ?',
                                [isRegular ? 'regular' : 'irregular', student.id],
                                () => {}
                            );

                            const nextSem = parseInt(semester) >= 2 ? 1 : parseInt(semester) + 1;
                            const nextYear = parseInt(semester) >= 2 ? student.year_level + 1 : student.year_level;

                            db.query(
                                `SELECT s.id as subject_id, s.code, s.name, s.units
                                 FROM curriculum c
                                 JOIN subjects s ON c.subject_id = s.id
                                 WHERE c.department_id = ? AND c.year_level = ? AND c.semester = ?`,
                                [student.department_id, nextYear, nextSem],
                                (err, nextSubjects) => {
                                    if (err) return res.status(500).json({ message: 'Database error', error: err });

                                    db.query('SELECT subject_id, prerequisite_id FROM prerequisites', (err, prereqs) => {
                                        if (err) return res.status(500).json({ message: 'Database error', error: err });

                                        const prereqMap = {};
                                        prereqs.forEach(p => {
                                            if (!prereqMap[p.subject_id]) prereqMap[p.subject_id] = [];
                                            prereqMap[p.subject_id].push(p.prerequisite_id);
                                        });

                                        const eligible = [];
                                        const notEligible = [];

                                        nextSubjects.forEach(sub => {
                                            const prereqsNeeded = prereqMap[sub.subject_id] || [];
                                            const meetsAllPrereqs = prereqsNeeded.every(pid => passedSubjectIds.has(pid));
                                            if (meetsAllPrereqs) {
                                                eligible.push(sub);
                                            } else {
                                                notEligible.push(sub);
                                            }
                                        });

                                        const toEnroll = [...eligible];
                                        if (!isRegular) {
                                            failedSubjectIds.forEach(fid => {
                                                const alreadyIn = toEnroll.find(s => s.subject_id === fid);
                                                if (!alreadyIn) toEnroll.push({ subject_id: fid, units: 0 });
                                            });
                                        }

                                        const totalUnits = toEnroll.reduce((sum, s) => sum + (s.units || 0), 0);
                                        const standardUnits = nextSubjects.reduce((sum, s) => sum + s.units, 0);
                                        const notices = [];

                                        if (totalUnits < 15) {
                                            notices.push({ type: 'unit_underload', message: `Your unit load (${totalUnits}) is below the minimum of 15 units. Please consult your advisor.` });
                                        } else if (totalUnits > standardUnits) {
                                            notices.push({ type: 'unit_overload', message: `Your unit load (${totalUnits}) exceeds the standard (${standardUnits} units). Please consult your advisor.` });
                                        }

                                        if (notEligible.length > 0) {
                                            notices.push({
                                                type: 'f2f_required',
                                                message: `You do not meet prerequisites for: ${notEligible.map(s => s.code).join(', ')}. Please consult your advisor.`
                                            });
                                        }

                                        if (toEnroll.length === 0) {
                                            return res.json({ message: 'No eligible subjects found.', notices });
                                        }

                                        const enrollValues = toEnroll.map(s => [student.id, s.subject_id, school_year, semester, 'auto_enrolled']);
                                        db.query(
                                            'INSERT INTO enrollments (student_id, subject_id, school_year, semester, status) VALUES ?',
                                            [enrollValues],
                                            (err) => {
                                                if (err) return res.status(500).json({ message: 'Error enrolling subjects', error: err });

                                                if (notices.length > 0) {
                                                    const noticeValues = notices.map(n => [student.id, n.type, n.message]);
                                                    db.query('INSERT INTO notices (student_id, type, message) VALUES ?', [noticeValues], () => {});
                                                }

                                                res.json({
                                                    message: isRegular ? 'Regular enrollment complete.' : 'Irregular enrollment complete.',
                                                    status: isRegular ? 'regular' : 'irregular',
                                                    enrolled: eligible.map(s => `${s.code} - ${s.name}`),
                                                    not_eligible: notEligible.map(s => `${s.code} - ${s.name}`),
                                                    notices,
                                                    school_year,
                                                    semester
                                                });
                                            }
                                        );
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    });
});
module.exports = router;