const express = require('express');
const pool = require('../config/db');
const axios = require('axios');
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

    const isHindi = /[\u0900-\u097f]/u.test(message);
    let reply;
    let intent;
    if (isHindi) {
        try {
            const { data: prepared } = await axios.post(
                `${process.env.AI_SERVICE_URL}/prepare-text`,
                { text: message },
                { timeout: 180000 }
            );
            if (!prepared.translation_used) {
                reply = 'क्षमा करें, अभी हिन्दी प्रश्न का अनुवाद उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर प्रयास करें।';
                intent = 'translation_unavailable';
            } else {
                const result = await generateReply(prepared.analysis_text, req.user);
                intent = result.intent;
                try {
                    const { data: translated } = await axios.post(
                        `${process.env.AI_SERVICE_URL}/translate-text`,
                        { text: result.reply, source_language: 'en', target_language: 'hi' },
                        { timeout: 180000 }
                    );
                    reply = `ध्यान दें: यह उत्तर मशीन अनुवादित है और गलत हो सकता है।\n\n${translated.translated_text}`;
                } catch (error) {
                    console.error('Hindi chatbot reply translation failed:', error.message);
                    reply = 'क्षमा करें, उत्तर का हिन्दी अनुवाद उपलब्ध नहीं है। कृपया अपना प्रश्न अंग्रेज़ी में पूछें।';
                }
            }
        } catch (error) {
            console.error('Hindi chatbot input translation failed:', error.message);
            reply = 'क्षमा करें, हिन्दी अनुवाद सेवा अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर प्रयास करें।';
            intent = 'translation_unavailable';
        }
    } else {
        ({ reply, intent } = await generateReply(message, req.user));
    }

    const { rows } = await pool.query(
        `INSERT INTO chatbot_logs (user_id, message, reply, intent)
         VALUES ($1, $2, $3, $4)
         RETURNING id, message, reply, intent, created_at`,
        [req.user.id, message, reply, intent]
    );

    res.status(201).json(rows[0]);
});

module.exports = router;
