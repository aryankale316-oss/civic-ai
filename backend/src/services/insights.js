const pool = require('../config/db');

const STOPWORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'to', 'of', 'and', 'or',
    'in', 'on', 'at', 'for', 'with', 'this', 'that', 'it', 'its', 'has', 'have', 'had', 'near',
    'my', 'our', 'there', 'not', 'no', 'so', 'as', 'by', 'from', 'will', 'would', 'can', 'could',
    'please', 'issue', 'problem', 'due', 'since', 'again', 'also', 'very', 'just',
]);

function extractCommonKeywords(texts, limit = 15) {
    const counts = new Map();
    for (const text of texts) {
        const words = (text.toLowerCase().match(/[a-z']+/g) || []).filter(
            (w) => w.length >= 3 && !STOPWORDS.has(w)
        );
        for (const word of words) {
            counts.set(word, (counts.get(word) || 0) + 1);
        }
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word, count]) => ({ word, count }));
}

// Ordinary least squares on (index, count) pairs — a simple trend line, not
// a validated time-series forecasting model. With only a handful of months
// of data, anything more sophisticated (ARIMA, Prophet) would be spurious.
function linearForecast(points) {
    const n = points.length;
    if (n < 2) return null;

    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const predicted = slope * n + intercept;
    return Math.max(0, Math.round(predicted));
}

function buildRecommendations({ growthPct, departmentWorkload, categoryConfidence, sentimentTrends, unassignedPendingCount }) {
    const recommendations = [];

    if (growthPct != null) {
        if (growthPct >= 20) {
            recommendations.push(`Complaint volume grew ${growthPct.toFixed(0)}% this month compared to last — consider reviewing department staffing.`);
        } else if (growthPct <= -20) {
            recommendations.push(`Complaint volume dropped ${Math.abs(growthPct).toFixed(0)}% this month compared to last.`);
        }
    }

    const busiest = departmentWorkload.filter((d) => d.pending_total > 0).sort((a, b) => b.pending_total - a.pending_total)[0];
    if (busiest && busiest.pending_total >= 3) {
        recommendations.push(`${busiest.department} has the largest pending backlog (${busiest.pending_total} complaints) — consider reassigning officers or adding staff.`);
    }

    const lowConfidence = categoryConfidence.filter((c) => c.count >= 5 && c.avg_confidence < 0.4).sort((a, b) => a.avg_confidence - b.avg_confidence)[0];
    if (lowConfidence) {
        recommendations.push(`AI classification confidence for "${lowConfidence.category}" complaints is low (${Math.round(lowConfidence.avg_confidence * 100)}%) — consider adding more labeled training examples for this category.`);
    }

    if (sentimentTrends.length >= 2) {
        const last = sentimentTrends[sentimentTrends.length - 1];
        const prev = sentimentTrends[sentimentTrends.length - 2];
        const lastTotal = last.positive + last.neutral + last.negative;
        const prevTotal = prev.positive + prev.neutral + prev.negative;
        if (lastTotal > 0 && prevTotal > 0) {
            const lastNegShare = last.negative / lastTotal;
            const prevNegShare = prev.negative / prevTotal;
            if (lastNegShare - prevNegShare >= 0.15) {
                recommendations.push('Citizen sentiment has trended more negative in the most recent month — review recent complaint handling and response times.');
            }
        }
    }

    if (unassignedPendingCount >= 3) {
        recommendations.push(`${unassignedPendingCount} pending complaints have no officer assigned yet.`);
    }

    if (recommendations.length === 0) {
        recommendations.push('No significant anomalies detected in this period.');
    }

    return recommendations;
}

async function getInsightsSummary() {
    const [confidenceOverall, confidenceByCategory, textsResult, sentimentTrends, monthlyCounts, departmentWorkload, unassignedPending, moderationFlags] =
        await Promise.all([
            pool.query('SELECT AVG(ai_confidence)::float AS avg_confidence, COUNT(*)::int AS count FROM complaints WHERE ai_confidence IS NOT NULL'),
            pool.query(`
                SELECT COALESCE(ai_category, 'Unclassified') AS category, AVG(ai_confidence)::float AS avg_confidence, COUNT(*)::int AS count
                FROM complaints WHERE ai_confidence IS NOT NULL
                GROUP BY 1 ORDER BY count DESC
            `),
            pool.query("SELECT title, description FROM complaints ORDER BY created_at DESC LIMIT 500"),
            pool.query(`
                SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                       COUNT(*) FILTER (WHERE sentiment = 'Positive')::int AS positive,
                       COUNT(*) FILTER (WHERE sentiment = 'Neutral')::int AS neutral,
                       COUNT(*) FILTER (WHERE sentiment = 'Negative')::int AS negative
                FROM complaints
                WHERE created_at >= now() - interval '12 months'
                GROUP BY 1 ORDER BY 1
            `),
            pool.query(`
                SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
                FROM complaints
                WHERE created_at >= now() - interval '12 months'
                GROUP BY 1 ORDER BY 1
            `),
            pool.query(`
                SELECT COALESCE(d.name, 'Unassigned') AS department,
                       COUNT(*) FILTER (WHERE c.status IN ('submitted', 'in_progress'))::int AS pending_total,
                       ROUND(AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 3600) FILTER (WHERE c.resolved_at IS NOT NULL))::int AS avg_resolution_hours
                FROM complaints c LEFT JOIN departments d ON d.id = c.department_id
                GROUP BY d.name ORDER BY pending_total DESC
            `),
            pool.query("SELECT count(*)::int AS count FROM complaints WHERE status IN ('submitted', 'in_progress') AND assigned_officer_id IS NULL"),
            pool.query(`
                SELECT
                    count(*) FILTER (WHERE is_profane)::int AS profane_count,
                    count(*) FILTER (WHERE spam_score >= 0.5)::int AS spam_count,
                    count(*) FILTER (WHERE is_repeated_submission)::int AS repeated_count
                FROM complaints
            `),
        ]);

    const commonKeywords = extractCommonKeywords(textsResult.rows.map((r) => `${r.title} ${r.description}`));

    const growthPoints = monthlyCounts.rows;
    let growthPct = null;
    if (growthPoints.length >= 2) {
        const current = growthPoints[growthPoints.length - 1].count;
        const previous = growthPoints[growthPoints.length - 2].count;
        growthPct = previous > 0 ? ((current - previous) / previous) * 100 : null;
    }

    const forecastCount = linearForecast(growthPoints.map((p, i) => ({ x: i, y: p.count })));
    let forecastLabel = null;
    if (growthPoints.length > 0) {
        const [year, month] = growthPoints[growthPoints.length - 1].month.split('-').map(Number);
        const nextMonthDate = new Date(Date.UTC(year, month, 1)); // month is 1-indexed already -> next month
        forecastLabel = nextMonthDate.toISOString().slice(0, 7);
    }

    const recommendations = buildRecommendations({
        growthPct,
        departmentWorkload: departmentWorkload.rows,
        categoryConfidence: confidenceByCategory.rows,
        sentimentTrends: sentimentTrends.rows,
        unassignedPendingCount: unassignedPending.rows[0].count,
    });

    return {
        classification_confidence: {
            overall: confidenceOverall.rows[0].avg_confidence,
            sample_size: confidenceOverall.rows[0].count,
            by_category: confidenceByCategory.rows,
            note: 'Average model confidence, not verified accuracy — no ground-truth labels are collected on submitted complaints yet.',
        },
        common_keywords: commonKeywords,
        sentiment_trends: sentimentTrends.rows,
        department_workload: departmentWorkload.rows,
        complaint_growth: {
            growth_pct: growthPct,
            current_month: growthPoints[growthPoints.length - 1] || null,
            previous_month: growthPoints[growthPoints.length - 2] || null,
        },
        monthly_forecast: {
            month: forecastLabel,
            predicted_count: forecastCount,
            note: 'Simple linear trend over recent months, not a validated forecasting model — accuracy improves with more historical data.',
        },
        moderation_summary: moderationFlags.rows[0],
        recommendations,
    };
}

module.exports = { getInsightsSummary };
