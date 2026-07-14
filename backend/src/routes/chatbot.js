const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { generateReply } = require('../services/chatbot');

const router = express.Router();

router.get('/history', requireAuth, async (req, res) => {
    const { rows } = await pool.query(
        'SELECT id, message, reply, intent, created_at FROM chatbot_logs WHERE user_id = $1 ORDER BY created_at ASC LIMIT 50',
        [req.user.id]
    );
    res.json(rows);
});

router.post('/message', requireAuth, async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'message is required' });
    }

    const { reply, intent } = await generateReply(message, req.user);

    const { rows } = await pool.query(
        `INSERT INTO chatbot_logs (user_id, message, reply, intent)
         VALUES ($1, $2, $3, $4)
         RETURNING id, message, reply, intent, created_at`,
        [req.user.id, message, reply, intent]
    );

    res.status(201).json(rows[0]);
});

module.exports = router;
