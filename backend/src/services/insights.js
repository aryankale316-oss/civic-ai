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

// Compare lightweight forecast methods with rolling one-month-ahead backtesting.
// This keeps the method understandable and avoids a heavy forecasting dependency.
function averageForecast(values) {
    const recent = values.slice(-3);
    return Math.round(recent.reduce((sum, value) => sum + value, 0) / recent.length);
}

// Fit a short trend to recent counts, then carry only half of its slope into
// the next month so a brief spike does not extrapolate unchecked.
function dampedTrendForecast(values) {
    const recent = values.slice(-6);
    const n = recent.length;
    if (n < 2) return recent[n - 1] || 0;

    const meanY = recent.reduce((sum, value) => sum + value, 0) / n;
    const meanX = (n - 1) / 2;
    let numerator = 0;
    let denominator = 0;
    recent.forEach((value, index) => {
        numerator += (index - meanX) * (value - meanY);
        denominator += (index - meanX) ** 2;
    });

    const slope = denominator === 0 ? 0 : numerator / denominator;
    return Math.max(0, Math.round(recent[n - 1] + slope * 0.5));
}

const FORECAST_MODELS = [
    { key: 'three_month_average', label: '3-month average', predict: averageForecast },
    { key: 'damped_trend', label: 'damped trend', predict: dampedTrendForecast },
    { key: 'last_month', label: 'last-month baseline', predict: (values) => values[values.length - 1] },
];

// Rolling-origin one-month-ahead backtesting uses only earlier months for
// each prediction. Select a model only after at least three scored forecasts.
function forecastWithBacktest(values) {
    if (values.length === 0 || values.every((value) => value === 0)) {
        return {
            predictedCount: null,
            model: null,
            backtest: { available: false, forecasts: 0, mae: null, baselineMae: null },
            note: 'No complaint history is available for a forecast.',
        };
    }

    const errors = Object.fromEntries(FORECAST_MODELS.map((model) => [model.key, []]));
    for (let targetIndex = 4; targetIndex < values.length; targetIndex += 1) {
        const history = values.slice(0, targetIndex);
        const actual = values[targetIndex];
        for (const model of FORECAST_MODELS) {
            errors[model.key].push(Math.abs(model.predict(history) - actual));
        }
    }

    const scoredForecasts = errors[FORECAST_MODELS[0].key].length;
    const activeMonths = values.filter((value) => value > 0).length;
    if (scoredForecasts < 3 || activeMonths < 4) {
        return {
            predictedCount: averageForecast(values),
            model: 'three_month_average',
            backtest: { available: false, forecasts: scoredForecasts, mae: null, baselineMae: null },
            note: 'Showing a 3-month average. At least four months with complaints are needed for a useful backtest.',
        };
    }

    const modelResults = FORECAST_MODELS.map((model) => ({
        ...model,
        mae: errors[model.key].reduce((sum, error) => sum + error, 0) / scoredForecasts,
    })).sort((a, b) => a.mae - b.mae);
    const selected = modelResults[0];
    const baseline = modelResults.find((model) => model.key === 'last_month');

    return {
        predictedCount: Math.max(0, selected.predict(values)),
        model: selected.key,
        backtest: {
            available: true,
            forecasts: scoredForecasts,
            mae: Math.round(selected.mae * 10) / 10,
            baselineMae: Math.round(baseline.mae * 10) / 10,
        },
        note: `Selected ${selected.label} by rolling one-month-ahead backtesting (${scoredForecasts} forecasts; MAE ${Math.round(selected.mae * 10) / 10} vs last-month baseline ${Math.round(baseline.mae * 10) / 10} complaints). Based on up to 12 monthly observations; treat as a planning estimate.`,
    };
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
                WITH months AS (
                    SELECT generate_series(
                        date_trunc('month', now()) - interval '11 months',
                        date_trunc('month', now()),
                        interval '1 month'
                    ) AS month_start
                )
                SELECT to_char(m.month_start, 'YYYY-MM') AS month, COUNT(c.id)::int AS count
                FROM months m
                LEFT JOIN complaints c ON date_trunc('month', c.created_at) = m.month_start
                GROUP BY m.month_start
                ORDER BY m.month_start
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

    const forecast = forecastWithBacktest(growthPoints.map((point) => point.count));
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
            predicted_count: forecast.predictedCount,
            model: forecast.model,
            backtest: forecast.backtest,
            note: forecast.note,
        },
        moderation_summary: moderationFlags.rows[0],
        recommendations,
    };
}

module.exports = { getInsightsSummary };
