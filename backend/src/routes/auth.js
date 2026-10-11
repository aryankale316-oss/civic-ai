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

    if (user.role === 'dept_admin') {
        const { rows } = await pool.query('SELECT is_active FROM departments WHERE id = $1', [user.department_id]);
        if (!rows[0]?.is_active) return res.status(403).json({ error: 'This department account is no longer active' });
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

// A user may only view and update their own account.  Keeping this separate
// from the admin user-management endpoints prevents citizens from changing
// roles or department scopes through a profile form.
router.get('/me', requireAuth, async (req, res) => {
    const result = await pool.query(
        'SELECT id, name, email, role, department_id FROM users WHERE id = $1',
        [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
});

router.patch('/me', requireAuth, async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, req.user.id]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const result = await pool.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, department_id',
        [name, email, req.user.id]
    );
    res.json(result.rows[0]);
});

router.patch('/me/password', requireAuth, async (req, res) => {
    const { current_password: currentPassword, new_password: newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (!(await bcrypt.compare(currentPassword, result.rows[0].password_hash))) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.status(204).end();
});

// Platform-admin-only: create a department-admin account. Departments don't
// self-register (mirrors how officers.js works — staff accounts are
// provisioned by the platform admin, not signed up).
router.post('/dept-admins', requireAuth, requireRole('admin'), async (req, res) => {
    const { name, email, password, department_id } = req.body;
    if (!name || !email || !password || !department_id) {
        return res.status(400).json({ error: 'name, email, password, and department_id are required' });
    }

    const deptRow = await pool.query('SELECT id FROM departments WHERE id = $1 AND is_active = true', [department_id]);
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
