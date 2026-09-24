const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
    const result = await pool.query('SELECT id, name FROM departments ORDER BY name');
    res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'Department name is required' });
    const duplicate = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1)', [name]);
    if (duplicate.rows.length) return res.status(409).json({ error: 'A department with this name already exists' });
    const result = await pool.query('INSERT INTO departments (name) VALUES ($1) RETURNING id, name', [name]);
    res.status(201).json(result.rows[0]);
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'Department name is required' });
    const duplicate = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1) AND id <> $2', [name, req.params.id]);
    if (duplicate.rows.length) return res.status(409).json({ error: 'A department with this name already exists' });
    const result = await pool.query('UPDATE departments SET name = $1 WHERE id = $2 RETURNING id, name', [name, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Department not found' });
    res.json(result.rows[0]);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    // Never silently orphan active data.  The admin must first reassign staff
    // and complaints before removing a department.
    const dependencies = await pool.query(
        `SELECT
            (SELECT COUNT(*) FROM complaints WHERE department_id = $1)::int AS complaints,
            (SELECT COUNT(*) FROM officers WHERE department_id = $1)::int AS officers,
            (SELECT COUNT(*) FROM users WHERE department_id = $1)::int AS users`,
        [req.params.id]
    );
    const { complaints, officers, users } = dependencies.rows[0];
    if (complaints || officers || users) {
        return res.status(409).json({ error: 'Reassign linked complaints, officers, and department admins before deleting this department' });
    }
    const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Department not found' });
    res.status(204).end();
});

module.exports = router;
