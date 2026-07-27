const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole, requireAnyRole } = require('../middleware/auth');

const router = express.Router();

const OFFICER_LIST_SELECT = `
    SELECT o.id, o.name, o.email, o.phone, o.status, o.created_at,
           d.id AS department_id, d.name AS department_name,
           COUNT(c.id) FILTER (WHERE c.status IN ('submitted', 'in_progress')) AS active_workload,
           COUNT(c.id) AS total_assigned,
           COUNT(c.id) FILTER (WHERE c.status = 'resolved') AS resolved_count
    FROM officers o
    LEFT JOIN departments d ON d.id = o.department_id
    LEFT JOIN complaints c ON c.assigned_officer_id = o.id
    GROUP BY o.id, d.id
    ORDER BY o.name
`;

function withPerformanceScore(row) {
    const totalAssigned = Number(row.total_assigned);
    const resolvedCount = Number(row.resolved_count);
    return {
        ...row,
        active_workload: Number(row.active_workload),
        total_assigned: totalAssigned,
        resolved_count: resolvedCount,
        // Simple, transparent metric: % of ever-assigned complaints this
        // officer has resolved. Null (not a fabricated number) until they
        // have at least one assignment.
        performance_score: totalAssigned > 0 ? Math.round((resolvedCount / totalAssigned) * 100) : null,
    };
}

router.use(requireAuth, requireAnyRole(['admin', 'dept_admin']));

// dept_admin only needs officers within their own department to fill the
// "assign officer" dropdown; the platform admin sees everyone.
router.get('/', async (req, res) => {
    if (req.user.role === 'dept_admin') {
        const { rows } = await pool.query(
            `${OFFICER_LIST_SELECT.replace('GROUP BY', 'WHERE o.department_id = $1 GROUP BY')}`,
            [req.user.department_id]
        );
        return res.json(rows.map(withPerformanceScore));
    }
    const { rows } = await pool.query(OFFICER_LIST_SELECT);
    res.json(rows.map(withPerformanceScore));
});

router.post('/', requireRole('admin'), async (req, res) => {
    const { name, email, phone, department_id } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: 'name and email are required' });
    }

    const existing = await pool.query('SELECT id FROM officers WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'An officer with this email already exists' });
    }

    const insertResult = await pool.query(
        'INSERT INTO officers (name, email, phone, department_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, phone || null, department_id || null]
    );

    const { rows } = await pool.query(`${OFFICER_LIST_SELECT.replace('GROUP BY', 'WHERE o.id = $1 GROUP BY')}`, [
        insertResult.rows[0].id,
    ]);
    res.status(201).json(withPerformanceScore(rows[0]));
});

router.get('/:id', async (req, res) => {
    const { rows } = await pool.query(`${OFFICER_LIST_SELECT.replace('GROUP BY', 'WHERE o.id = $1 GROUP BY')}`, [
        req.params.id,
    ]);
    const officer = rows[0];
    if (!officer) {
        return res.status(404).json({ error: 'Officer not found' });
    }

    const { rows: complaints } = await pool.query(
        `SELECT id, title, status, ai_priority, ai_category, created_at
         FROM complaints WHERE assigned_officer_id = $1 ORDER BY created_at DESC`,
        [req.params.id]
    );

    res.json({ ...withPerformanceScore(officer), complaints });
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
    const { name, phone, department_id, status } = req.body;
    if (status && !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'status must be active or inactive' });
    }

    const result = await pool.query(
        `UPDATE officers
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             department_id = COALESCE($3, department_id),
             status = COALESCE($4, status),
             updated_at = now()
         WHERE id = $5
         RETURNING id`,
        [name || null, phone || null, department_id || null, status || null, req.params.id]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Officer not found' });
    }

    const { rows } = await pool.query(`${OFFICER_LIST_SELECT.replace('GROUP BY', 'WHERE o.id = $1 GROUP BY')}`, [
        req.params.id,
    ]);
    res.json(withPerformanceScore(rows[0]));
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
    const result = await pool.query('DELETE FROM officers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Officer not found' });
    }
    res.status(204).send();
});

module.exports = router;
