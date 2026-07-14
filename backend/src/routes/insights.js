const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getInsightsSummary } = require('../services/insights');

const router = express.Router();

router.get('/summary', requireAuth, requireRole('admin'), async (req, res) => {
    const summary = await getInsightsSummary();
    res.json(summary);
});

module.exports = router;
