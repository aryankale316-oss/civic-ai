require('dotenv').config();
require('express-async-errors');
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const complaintRoutes = require('./routes/complaints');
const geoRoutes = require('./routes/geo');
const analyticsRoutes = require('./routes/analytics');
const officerRoutes = require('./routes/officers');
const notificationRoutes = require('./routes/notifications');
const chatbotRoutes = require('./routes/chatbot');
const reportRoutes = require('./routes/reports');
const insightsRoutes = require('./routes/insights');
const { initSocket } = require('./realtime');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/insights', insightsRoutes);

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message?.includes('images are allowed')) {
        return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

const port = process.env.PORT || 5000;
httpServer.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
