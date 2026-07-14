const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Proxies OpenStreetMap Nominatim so requests carry a proper User-Agent
// (required by Nominatim's usage policy) and browsers never hit a
// cross-origin third party directly from client code.
router.get('/reverse', requireAuth, async (req, res) => {
    const { lat, lon } = req.query;
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ error: 'lat and lon query params are required and must be numbers' });
    }

    try {
        const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat: latitude, lon: longitude, format: 'jsonv2' },
            headers: { 'User-Agent': 'civic-ai-grievance-platform/1.0 (reverse-geocode)' },
            timeout: 5000,
        });
        res.json({ address: data.display_name || null });
    } catch (err) {
        console.error('Reverse geocode failed:', err.message);
        res.status(502).json({ error: 'Reverse geocoding is temporarily unavailable' });
    }
});

module.exports = router;
