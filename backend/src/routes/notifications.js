const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
        `SELECT id, complaint_id, type, title, message, is_read, created_at
         FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.user.id]
    );
    const { rows: unread } = await pool.query(
        'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
        [req.user.id]
    );
    res.json({ notifications: rows, unread_count: unread[0].count });
});

router.patch('/:id/read', requireAuth, async (req, res) => {
    const result = await pool.query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
        [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Notification not found' });
    }
    res.status(204).send();
});

router.patch('/read-all', requireAuth, async (req, res) => {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [req.user.id]);
    res.status(204).send();
});

module.exports = router;
