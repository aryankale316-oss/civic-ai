const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { DEPARTMENTS } = require('../constants/departments');

const router = express.Router();

router.get('/', async (req, res) => {
    const result = await pool.query('SELECT id, name FROM departments WHERE is_active = true ORDER BY name');
    res.json(result.rows);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!DEPARTMENTS.includes(name)) return res.status(400).json({ error: 'Only the six configured departments can be enabled' });
    const duplicate = await pool.query('SELECT id, is_active FROM departments WHERE LOWER(name) = LOWER($1)', [name]);
    if (duplicate.rows.length) {
        const { rows } = await pool.query('UPDATE departments SET is_active = true WHERE id = $1 RETURNING id, name', [duplicate.rows[0].id]);
        return res.status(200).json(rows[0]);
    }
    const result = await pool.query('INSERT INTO departments (name, is_active) VALUES ($1, true) RETURNING id, name', [name]);
    res.status(201).json(result.rows[0]);
});

router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    return res.status(400).json({ error: 'Department names are fixed to the six configured departments.' });
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    return res.status(400).json({ error: 'The six configured departments cannot be deleted. Historical departments are retired by migration.' });
});

module.exports = router;
