const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization token' });
    }
    const token = header.slice('Bearer '.length);
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        if (req.user.role !== 'dept_admin') return next();
        pool.query(
            `SELECT 1 FROM users u JOIN departments d ON d.id = u.department_id
             WHERE u.id = $1 AND d.is_active = true`,
            [req.user.id]
        ).then(({ rows }) => {
            if (!rows.length) return res.status(403).json({ error: 'This department account is no longer active' });
            next();
        }).catch((err) => {
            console.error('Department access check failed:', err.message);
            res.status(503).json({ error: 'Unable to verify department access' });
        });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

function requireAnyRole(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRole, requireAnyRole };
