const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getForecastHotspots, getInsightsSummary } = require('../services/insights');

const router = express.Router();

router.get('/summary', requireAuth, requireRole('admin'), async (req, res) => {
    const summary = await getInsightsSummary();
    res.json(summary);
});

router.get('/forecast-hotspots', requireAuth, requireRole('admin'), async (req, res) => {
    const forecast = await getForecastHotspots();
    res.json(forecast);
});

module.exports = router;
