const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email, and password are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
        [name, email, hash, 'citizen']
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
        { id: user.id, role: user.role, department_id: user.department_id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, department_id: user.department_id },
    });
});

// Platform-admin-only: create a department-admin account. Departments don't
// self-register (mirrors how officers.js works — staff accounts are
// provisioned by the platform admin, not signed up).
router.post('/dept-admins', requireAuth, requireRole('admin'), async (req, res) => {
    const { name, email, password, department_id } = req.body;
    if (!name || !email || !password || !department_id) {
        return res.status(400).json({ error: 'name, email, password, and department_id are required' });
    }

    const deptRow = await pool.query('SELECT id FROM departments WHERE id = $1', [department_id]);
    if (deptRow.rows.length === 0) {
        return res.status(400).json({ error: 'Department not found' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, department_id)
         VALUES ($1, $2, $3, 'dept_admin', $4)
         RETURNING id, name, email, role, department_id`,
        [name, email, hash, department_id]
    );

    res.status(201).json(result.rows[0]);
});

module.exports = router;
