const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', requireAuth, requireRole('admin'), async (req, res) => {
    const [perMonth, byDepartment, byPriority, byStatus, avgResolution, topCategories, topLocations, officerWorkload, satisfaction, departmentRating, departmentPerformance] = await Promise.all([
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
        pool.query(`
            SELECT d.id, d.name AS department,
                   COUNT(DISTINCT c.id)::int AS total_complaints,
                   COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('submitted', 'in_progress'))::int AS pending_complaints,
                   COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'resolved')::int AS resolved_complaints,
                   COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('submitted', 'in_progress') AND c.assigned_officer_id IS NOT NULL)::int AS assigned_pending,
                   COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'active')::int AS active_officers,
                   AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 3600) FILTER (WHERE c.resolved_at IS NOT NULL)::float AS avg_resolution_hours,
                   AVG(f.rating)::float AS avg_rating,
                   COUNT(DISTINCT f.id)::int AS total_ratings
            FROM departments d
            LEFT JOIN complaints c ON c.department_id = d.id
            LEFT JOIN officers o ON o.department_id = d.id
            LEFT JOIN feedback f ON f.complaint_id = c.id
            GROUP BY d.id, d.name
            ORDER BY d.name
        `),
    ]);

    const statusCounts = Object.fromEntries(byStatus.rows.map((r) => [r.status, r.count]));
    const total = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
    const resolved = statusCounts.resolved || 0;
    const pending = (statusCounts.submitted || 0) + (statusCounts.in_progress || 0);
    const overallResolutionHours = avgResolution.rows[0].avg_hours;

    // Transparent operational outlook rather than a trained prediction.
    // It is unavailable until the department has enough of its own history.
    const performanceOutlook = departmentPerformance.rows.map((row) => {
        const totalCount = Number(row.total_complaints);
        const pendingCount = Number(row.pending_complaints);
        const resolvedCount = Number(row.resolved_complaints);
        const officers = Number(row.active_officers);
        const assignedPending = Number(row.assigned_pending);
        const ratings = Number(row.total_ratings);
        if (totalCount < 3) {
            return { ...row, available: false, score: null, outlook: 'Insufficient history', note: 'At least 3 department complaints are needed before an outlook is calculated.' };
        }
        const resolutionRate = resolvedCount / totalCount;
        const assignmentCoverage = pendingCount === 0 ? 1 : assignedPending / pendingCount;
        const workloadPressure = Math.min(1, pendingCount / Math.max(officers, 1) / 8);
        const resolutionSpeed = row.avg_resolution_hours == null || overallResolutionHours == null
            ? null : Math.min(1, Number(overallResolutionHours) / Math.max(Number(row.avg_resolution_hours), 1));
        const satisfactionScore = ratings > 0 ? Number(row.avg_rating) / 5 : null;
        const components = [[resolutionRate, 0.35], [assignmentCoverage, 0.25], [1 - workloadPressure, 0.20]];
        if (resolutionSpeed != null) components.push([resolutionSpeed, 0.10]);
        if (satisfactionScore != null) components.push([satisfactionScore, 0.10]);
        const weight = components.reduce((sum, [, w]) => sum + w, 0);
        const score = Math.round((components.reduce((sum, [value, w]) => sum + value * w, 0) / weight) * 100);
        return {
            ...row, available: true, score,
            outlook: score >= 75 ? 'Strong' : score >= 50 ? 'Watch' : 'At risk',
            resolution_rate: resolutionRate, assignment_coverage: assignmentCoverage, workload_pressure: workloadPressure,
            note: 'Based on workload, backlog assignment coverage, resolved-complaint rate, resolution time, and available feedback. Not a validated future-performance prediction.',
        };
    });

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
        department_performance: {
            data: performanceOutlook,
            note: 'Transparent operational outlook only; it is not a trained or validated forecasting model.',
        },
        officer_workload: {
            available: officerWorkload.rows.length > 0,
            data: officerWorkload.rows,
            note: officerWorkload.rows.length === 0 ? 'No active officers yet — add one on the Officers page.' : null,
        },
    });
});

module.exports = router;
