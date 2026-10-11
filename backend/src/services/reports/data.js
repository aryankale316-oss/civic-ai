const pool = require('../../config/db');

async function getComplaintsReport({ status, departmentId } = {}) {
    const conditions = [];
    const params = [];
    if (status) {
        params.push(status);
        conditions.push(`c.status = $${params.length}`);
    }
    if (departmentId) {
        params.push(departmentId);
        conditions.push(`c.department_id = $${params.length}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
        `SELECT c.id, c.title, u.name AS citizen_name, COALESCE(d.name, 'Unassigned') AS department_name,
                COALESCE(c.ai_priority, 'Unclassified') AS priority, c.status,
                COALESCE(c.sentiment, 'N/A') AS sentiment, c.created_at, c.resolved_at
         FROM complaints c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN departments d ON d.id = c.department_id
         ${where}
         ORDER BY c.created_at DESC`,
        params
    );

    const columns = [
        { key: 'id', label: 'ID', width: 35 },
        { key: 'title', label: 'Title', width: 130 },
        { key: 'citizen_name', label: 'Citizen', width: 90 },
        { key: 'department_name', label: 'Department', width: 90 },
        { key: 'priority', label: 'Priority', width: 60 },
        { key: 'status', label: 'Status', width: 70 },
        { key: 'sentiment', label: 'Sentiment', width: 65 },
        { key: 'created_at', label: 'Submitted', width: 90 },
        { key: 'resolved_at', label: 'Resolved', width: 90 },
    ];

    return {
        title: 'Complaint Report',
        subtitle: `${rows.length} complaint${rows.length === 1 ? '' : 's'}${status ? ` — status: ${status}` : ''}`,
        columns,
        rows: rows.map((r) => ({
            ...r,
            created_at: new Date(r.created_at).toLocaleDateString(),
            resolved_at: r.resolved_at ? new Date(r.resolved_at).toLocaleDateString() : '',
        })),
    };
}

async function getDepartmentsReport() {
    const { rows } = await pool.query(`
        SELECT COALESCE(d.name, 'Unassigned') AS department,
               COUNT(c.id)::int AS total_complaints,
               COUNT(c.id) FILTER (WHERE c.status = 'resolved')::int AS resolved,
               COUNT(c.id) FILTER (WHERE c.status IN ('submitted', 'in_progress'))::int AS pending,
               ROUND(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 3600) FILTER (WHERE c.resolved_at IS NOT NULL))::int AS avg_resolution_hours
        FROM complaints c
        LEFT JOIN departments d ON d.id = c.department_id
         WHERE d.is_active = true OR c.department_id IS NULL
        GROUP BY d.name
        ORDER BY total_complaints DESC
    `);

    const columns = [
        { key: 'department', label: 'Department', width: 120 },
        { key: 'total_complaints', label: 'Total', width: 60 },
        { key: 'resolved', label: 'Resolved', width: 70 },
        { key: 'pending', label: 'Pending', width: 70 },
        { key: 'avg_resolution_hours', label: 'Avg. Resolution (hrs)', width: 130 },
    ];

    return {
        title: 'Department Report',
        subtitle: `${rows.length} department${rows.length === 1 ? '' : 's'}`,
        columns,
        rows: rows.map((r) => ({ ...r, avg_resolution_hours: r.avg_resolution_hours ?? 'N/A' })),
    };
}

async function getMonthlyReport() {
    const { rows } = await pool.query(`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS total_complaints,
               COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved
        FROM complaints
        WHERE created_at >= now() - interval '12 months'
        GROUP BY 1
        ORDER BY 1
    `);

    const columns = [
        { key: 'month', label: 'Month', width: 100 },
        { key: 'total_complaints', label: 'Total Complaints', width: 130 },
        { key: 'resolved', label: 'Resolved', width: 100 },
    ];

    return {
        title: 'Monthly Report',
        subtitle: 'Last 12 months',
        columns,
        rows,
    };
}

async function getAnalyticsReport() {
    const [totals, byDept, byCategory, avgRes] = await Promise.all([
        pool.query(`
            SELECT count(*)::int AS total,
                   count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
                   count(*) FILTER (WHERE status IN ('submitted', 'in_progress'))::int AS pending
            FROM complaints
        `),
        pool.query(`
            SELECT COALESCE(d.name, 'Unassigned') AS label, count(*)::int AS value
            FROM complaints c LEFT JOIN departments d ON d.id = c.department_id
            WHERE d.is_active = true OR c.department_id IS NULL
            GROUP BY 1 ORDER BY value DESC LIMIT 5
        `),
        pool.query(`
            SELECT CASE ai_category
                       WHEN 'Roads' THEN 'Roads and Footpaths'
                       WHEN 'Garbage' THEN 'Solid Waste and Garbage'
                       WHEN 'Drainage' THEN 'Sewerage and Drainage'
                       WHEN 'Electricity' THEN 'Electricity and Streetlights'
                       WHEN 'Transport' THEN 'Public Transport'
                       ELSE COALESCE(ai_category, 'Unclassified')
                   END AS label, count(*)::int AS value
            FROM complaints WHERE ai_category IS NULL OR ai_category NOT IN ('Health', 'Public Safety')
            GROUP BY 1 ORDER BY value DESC LIMIT 5
        `),
        pool.query(`
            SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::float AS avg_hours
            FROM complaints WHERE resolved_at IS NOT NULL
        `),
    ]);

    const total = totals.rows[0].total;
    const resolved = totals.rows[0].resolved;
    const pending = totals.rows[0].pending;
    const resolutionRate = total > 0 ? `${Math.round((resolved / total) * 100)}%` : 'N/A';
    const avgHours = avgRes.rows[0].avg_hours;

    const kpis = [
        { label: 'Total complaints', value: total },
        { label: 'Resolved', value: resolved },
        { label: 'Pending', value: pending },
        { label: 'Resolution rate', value: resolutionRate },
        { label: 'Avg. resolution time (hrs)', value: avgHours != null ? Math.round(avgHours) : 'N/A' },
    ];

    const labelValueColumns = [
        { key: 'label', label: 'Category', width: 200 },
        { key: 'value', label: 'Complaints', width: 100 },
    ];

    const sections = [
        { title: 'Top Departments', columns: labelValueColumns, rows: byDept.rows },
        { title: 'Top Categories', columns: labelValueColumns, rows: byCategory.rows },
    ];

    // Flattened for CSV/Excel, which don't support the multi-section PDF layout.
    const flatColumns = [
        { key: 'metric', label: 'Metric', width: 200 },
        { key: 'value', label: 'Value', width: 120 },
    ];
    const flatRows = [
        ...kpis.map((k) => ({ metric: k.label, value: k.value })),
        ...byDept.rows.map((r) => ({ metric: `Top department: ${r.label}`, value: r.value })),
        ...byCategory.rows.map((r) => ({ metric: `Top category: ${r.label}`, value: r.value })),
    ];

    return {
        title: 'Analytics Report',
        subtitle: `Generated ${new Date().toLocaleDateString()}`,
        kpis,
        sections,
        columns: flatColumns,
        rows: flatRows,
    };
}

module.exports = { getComplaintsReport, getDepartmentsReport, getMonthlyReport, getAnalyticsReport };
