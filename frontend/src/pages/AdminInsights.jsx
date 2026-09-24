import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { MetricRow, NoticeCard } from '../components/civic';
import ChartCard from '../components/charts/ChartCard';
import SingleSeriesBarChart from '../components/charts/SingleSeriesBarChart';
import SentimentTrendChart from '../components/charts/SentimentTrendChart';
import PageTransition from '../components/ui/PageTransition';
import { SkeletonCard } from '../components/ui/Skeleton';

export default function AdminInsights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/insights/summary')
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load insights'));
  }, []);

  return (
    <div className="admin-page min-h-screen">
      <Navbar />
      <PageTransition className="max-w-6xl mx-auto px-6 py-8">
        <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">Back office</p>
        <h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-6">AI Insights</h1>

        {error && <p className="text-stamp-red mb-4">{error}</p>}
        {!data && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {data && (
          <>
            <MetricRow
              className="sm:grid-cols-4 mb-6"
              metrics={[
                {
                  label: 'Avg. classification confidence',
                  value: data.classification_confidence.overall != null ? `${Math.round(data.classification_confidence.overall * 100)}%` : '—',
                  note: data.classification_confidence.note,
                },
                {
                  label: 'Complaint growth (MoM)',
                  value: data.complaint_growth.growth_pct != null ? `${data.complaint_growth.growth_pct >= 0 ? '+' : ''}${data.complaint_growth.growth_pct.toFixed(0)}%` : '—',
                  note: data.complaint_growth.growth_pct == null ? 'Not enough months of data yet' : `${data.complaint_growth.current_month?.count ?? 0} this month`,
                },
                {
                  label: `Forecast${data.monthly_forecast.month ? ` (${data.monthly_forecast.month})` : ''}`,
                  value: data.monthly_forecast.predicted_count != null ? data.monthly_forecast.predicted_count.toLocaleString() : '—',
                  note: data.monthly_forecast.note,
                },
                {
                  label: 'Flagged complaints',
                  value: (data.moderation_summary.profane_count + data.moderation_summary.spam_count + data.moderation_summary.repeated_count).toLocaleString(),
                  note: 'Profanity, spam, or repeated submissions — see Dashboard filters',
                },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <ChartCard index={4} title="Sentiment trends" subtitle="Last 12 months">
                <SentimentTrendChart
                  data={data.sentiment_trends.map((r) => ({ ...r, month: r.month }))}
                />
              </ChartCard>

              <ChartCard index={5} title="Department workload" subtitle="Pending + in-progress complaints">
                <SingleSeriesBarChart data={data.department_workload} dataKey="pending_total" nameKey="department" height={220} />
              </ChartCard>

              <ChartCard index={6} title="Common complaint keywords" subtitle="Most frequent words across recent complaints">
                <SingleSeriesBarChart data={data.common_keywords} dataKey="count" nameKey="word" height={280} />
              </ChartCard>

              <ChartCard index={7} title="Classification confidence by category">
                <SingleSeriesBarChart
                  data={data.classification_confidence.by_category.map((c) => ({ ...c, confidence_pct: Math.round(c.avg_confidence * 100) }))}
                  dataKey="confidence_pct"
                  nameKey="category"
                  height={220}
                />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <NoticeCard className="animate-fade-in-up" style={{ animationDelay: '480ms' }}>
                <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">Recommendations</h2>
                <ul className="text-sm text-ink-soft space-y-2 list-disc pl-4">
                  {data.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </NoticeCard>

              <NoticeCard className="animate-fade-in-up" style={{ animationDelay: '540ms' }}>
                <h2 className="text-sm font-medium text-ink dark:text-paper mb-2">Geographic heatmap</h2>
                <p className="text-sm text-ink-soft mb-3">
                  Complaint density and hotspot clusters are visualized on an interactive map.
                </p>
                <Link
                  to="/admin/hotspots"
                  className="inline-block px-3 py-1.5 text-sm bg-ink text-paper hover:bg-ink/90 transition-colors"
                >
                  View Hotspot Heatmap →
                </Link>
              </NoticeCard>
            </div>
          </>
        )}
      </PageTransition>
    </div>
  );
}
