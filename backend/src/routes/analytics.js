const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', requireAuth, requireRole('admin'), async (req, res) => {
    const [perMonth, byDepartment, byPriority, byStatus, avgResolution, topCategories, topLocations, officerWorkload, satisfaction, departmentRating] = await Promise.all([
        pool.query(`
            SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)::int AS count
            FROM complaints
            WHERE created_at >= now() - interval '12 months'
            GROUP BY 1
            ORDER BY 1
        `),
        pool.query(`
            SELECT COALESCE(d.name, 'Unassigned') AS department, count(*)::int AS count
            FROM complaints c
            LEFT JOIN departments d ON d.id = c.department_id
            GROUP BY 1
            ORDER BY count DESC
        `),
        pool.query(`
            SELECT COALESCE(ai_priority, 'Unclassified') AS priority, count(*)::int AS count
            FROM complaints
            GROUP BY 1
        `),
        pool.query(`
            SELECT status, count(*)::int AS count
            FROM complaints
            GROUP BY 1
        `),
        pool.query(`
            SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::float AS avg_hours
            FROM complaints
            WHERE resolved_at IS NOT NULL
        `),
        pool.query(`
            SELECT COALESCE(ai_category, 'Unclassified') AS category, count(*)::int AS count
            FROM complaints
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 5
        `),
        pool.query(`
            SELECT location_text, count(*)::int AS count
            FROM complaints
            WHERE location_text IS NOT NULL AND location_text <> ''
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 5
        `),
        pool.query(`
            SELECT o.name AS officer, COUNT(c.id) FILTER (WHERE c.status IN ('submitted', 'in_progress'))::int AS active_workload
            FROM officers o
            LEFT JOIN complaints c ON c.assigned_officer_id = o.id
            WHERE o.status = 'active'
            GROUP BY o.id
            ORDER BY active_workload DESC
        `),
        pool.query(`
            SELECT AVG(rating)::float AS avg_rating, count(*)::int AS total_ratings
            FROM feedback
        `),
        pool.query(`
            SELECT COALESCE(d.name, 'Unassigned') AS department, AVG(f.rating)::float AS avg_rating, count(*)::int AS total_ratings
            FROM feedback f
            JOIN complaints c ON c.id = f.complaint_id
            LEFT JOIN departments d ON d.id = c.department_id
            GROUP BY d.name
            ORDER BY avg_rating DESC
        `),
    ]);

    const statusCounts = Object.fromEntries(byStatus.rows.map((r) => [r.status, r.count]));
    const total = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
    const resolved = statusCounts.resolved || 0;
    const pending = (statusCounts.submitted || 0) + (statusCounts.in_progress || 0);

    res.json({
        complaints_per_month: perMonth.rows,
        complaints_by_department: byDepartment.rows,
        priority_distribution: byPriority.rows,
        status_breakdown: byStatus.rows,
        total_complaints: total,
        resolved_complaints: resolved,
        resolution_rate: total > 0 ? resolved / total : 0,
        pending_complaints: pending,
        average_resolution_hours: avgResolution.rows[0].avg_hours,
        top_categories: topCategories.rows,
        top_locations: topLocations.rows,
        citizen_satisfaction: {
            available: satisfaction.rows[0].total_ratings > 0,
            average_rating: satisfaction.rows[0].avg_rating,
            total_ratings: satisfaction.rows[0].total_ratings,
            note: satisfaction.rows[0].total_ratings === 0 ? 'No feedback submitted yet.' : null,
        },
        department_rating: {
            available: departmentRating.rows.length > 0,
            data: departmentRating.rows,
            note: departmentRating.rows.length === 0 ? 'No feedback submitted yet.' : null,
        },
        officer_workload: {
            available: officerWorkload.rows.length > 0,
            data: officerWorkload.rows,
            note: officerWorkload.rows.length === 0 ? 'No active officers yet — add one on the Officers page.' : null,
        },
    });
});

module.exports = router;
