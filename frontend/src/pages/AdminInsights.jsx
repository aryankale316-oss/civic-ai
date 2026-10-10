
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import AdminShell from '../components/AdminShell';
import { MetricRow, NoticeCard } from '../components/civic';
import ChartCard from '../components/charts/ChartCard';
import SingleSeriesBarChart from '../components/charts/SingleSeriesBarChart';
import SentimentTrendChart from '../components/charts/SentimentTrendChart';
import PageTransition from '../components/ui/PageTransition';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useLanguage } from '../context/LanguageContext';

export default function AdminInsights() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/insights/summary')
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load insights'));
  }, []);

  return (
    <AdminShell>
      <PageTransition className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-civic dark:text-seal-green">
          {t('Decision support')}
        </p>

        <h1 className="mb-6 text-3xl font-display font-semibold text-ink dark:text-paper">
          {t('AI Insights')}
        </h1>

        {error && (
          <p className="mb-4 text-stamp-red">{error}</p>
        )}

        {!data && !error && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {data && (
          <>
            <MetricRow
              className="mb-6 sm:grid-cols-4"
              metrics={[
                {
                  label: t('Avg. classification confidence'),
                  value:
                    data.classification_confidence.overall != null
                      ? `${Math.round(
                          data.classification_confidence.overall * 100
                        )}%`
                      : '—',
                  note: data.classification_confidence.note,
                },
                {
                  label: t('Complaint growth (MoM)'),
                  value:
                    data.complaint_growth.growth_pct != null
                      ? `${
                          data.complaint_growth.growth_pct >= 0
                            ? '+'
                            : ''
                        }${data.complaint_growth.growth_pct.toFixed(0)}%`
                      : '—',
                  note:
                    data.complaint_growth.growth_pct == null
                      ? t('Not enough months of data yet')
                      : `${
                          data.complaint_growth.current_month?.count ?? 0
                        } this month`,
                },
                {
                  label: `${t('Forecast')}${
                    data.monthly_forecast.month
                      ? ` (${data.monthly_forecast.month})`
                      : ''
                  }`,
                  value:
                    data.monthly_forecast.predicted_count != null
                      ? data.monthly_forecast.predicted_count.toLocaleString()
                      : '—',
                  note: data.monthly_forecast.note,
                },
                {
                  label: t('Flagged complaints'),
                  value: (
                    data.moderation_summary.profane_count +
                    data.moderation_summary.spam_count +
                    data.moderation_summary.repeated_count
                  ).toLocaleString(),
                  note:
                    'Profanity, spam, or repeated submissions — see Dashboard filters',
                },
              ]}
            />

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard
                index={4}
                  title={t('Sentiment trends')}
                subtitle={t('Last 12 months')}
              >
                <SentimentTrendChart
                  data={data.sentiment_trends.map((r) => ({
                    ...r,
                    month: r.month,
                  }))}
                />
              </ChartCard>

              <ChartCard
                index={5}
                title={t('Department workload')}
                subtitle={t('Pending + in-progress complaints')}
              >
                <SingleSeriesBarChart
                  data={data.department_workload}
                  dataKey="pending_total"
                  nameKey="department"
                  height={220}
                />
              </ChartCard>

              <ChartCard
                index={6}
                title={t('Common complaint keywords')}
                subtitle={t('Most frequent words across recent complaints')}
              >
                <SingleSeriesBarChart
                  data={data.common_keywords}
                  dataKey="count"
                  nameKey="word"
                  height={280}
                />
              </ChartCard>

              <ChartCard
                index={7}
                title={t('Classification confidence by category')}
              >
                <SingleSeriesBarChart
                  data={data.classification_confidence.by_category.map(
                    (c) => ({
                      ...c,
                      confidence_pct: Math.round(
                        c.avg_confidence * 100
                      ),
                    })
                  )}
                  dataKey="confidence_pct"
                  nameKey="category"
                  height={220}
                />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <NoticeCard
                className="animate-fade-in-up"
                style={{ animationDelay: '480ms' }}
              >
                <h2 className="mb-2 text-sm font-medium text-ink dark:text-paper">
                  {t('Recommendations')}
                </h2>

                <ul className="list-disc space-y-2 pl-4 text-sm text-ink-soft">
                  {data.recommendations.map((rec, i) => (
                    <li key={i}>{t(rec)}</li>
                  ))}
                </ul>
              </NoticeCard>

              <NoticeCard
                className="animate-fade-in-up"
                style={{ animationDelay: '540ms' }}
              >
                <h2 className="mb-2 text-sm font-medium text-ink dark:text-paper">
                  Geographic heatmap
                </h2>

                <p className="mb-3 text-sm text-ink-soft">
                  Complaint density and hotspot clusters are visualized on
                  an interactive map.
                </p>

                <Link
                  to="/admin/hotspots"
                  className="inline-block bg-ink px-3 py-1.5 text-sm text-paper transition-colors hover:bg-ink/90"
                >
                  View Hotspot Heatmap →
                </Link>
              </NoticeCard>
            </div>
          </>
        )}
      </PageTransition>
    </AdminShell>
  );
}

