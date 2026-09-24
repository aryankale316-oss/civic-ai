import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { MetricRow } from '../components/civic';
import ChartCard from '../components/charts/ChartCard';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart';
import SingleSeriesBarChart from '../components/charts/SingleSeriesBarChart';
import PriorityDistributionChart from '../components/charts/PriorityDistributionChart';
import PageTransition from '../components/ui/PageTransition';
import { SkeletonCard } from '../components/ui/Skeleton';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(monthStr) {
  const [year, month] = monthStr.split('-');
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
}

function formatHours(hours) {
  if (hours == null) return null;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/analytics/summary')
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load analytics'));
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1424] text-[#f7fafc]">
      <Navbar />
      <PageTransition className="max-w-6xl mx-auto px-6 py-8 [&_h1]:text-[#f7fafc] [&_h2]:text-[#f7fafc] [&_.bg-white]:bg-[#142238] [&_.text-ink]:text-[#f7fafc] [&_.text-ink-soft]:text-[#a6b6c8] [&_.border-paper-line]:border-[#263750]">
        <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">Board summary</p>
        <h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-6">Analytics</h1>

        {error && <p className="text-stamp-red mb-4">{error}</p>}
        {!data && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {data && (
          <>
            <MetricRow
              className="lg:grid-cols-6 mb-6"
              metrics={[
                { label: 'Total complaints', value: data.total_complaints.toLocaleString() },
                { label: 'Pending', value: data.pending_complaints.toLocaleString() },
                { label: 'Resolved', value: data.resolved_complaints.toLocaleString() },
                { label: 'Resolution rate', value: `${Math.round(data.resolution_rate * 100)}%`, ratio: data.resolution_rate },
                {
                  label: 'Avg. resolution time',
                  value: formatHours(data.average_resolution_hours) ?? '—',
                  unavailable: data.average_resolution_hours == null,
                  note: data.average_resolution_hours == null ? 'No resolved complaints yet' : undefined,
                },
                {
                  label: 'Citizen satisfaction',
                  value: data.citizen_satisfaction.available ? `${data.citizen_satisfaction.average_rating.toFixed(1)} ★` : undefined,
                  unavailable: !data.citizen_satisfaction.available,
                  note: data.citizen_satisfaction.available
                    ? `${data.citizen_satisfaction.total_ratings} rating${data.citizen_satisfaction.total_ratings === 1 ? '' : 's'}`
                    : data.citizen_satisfaction.note,
                },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <ChartCard index={6} title="Complaints per month" subtitle="Last 12 months">
                <MonthlyTrendChart
                  data={data.complaints_per_month.map((r) => ({ month: formatMonth(r.month), count: r.count }))}
                />
              </ChartCard>

              <ChartCard index={7} title="Priority distribution">
                <PriorityDistributionChart data={data.priority_distribution} />
              </ChartCard>

              <ChartCard index={8} title="Complaints by department">
                <SingleSeriesBarChart data={data.complaints_by_department} dataKey="count" nameKey="department" />
              </ChartCard>

              <ChartCard index={9} title="Top complaint categories">
                <SingleSeriesBarChart data={data.top_categories} dataKey="count" nameKey="category" />
              </ChartCard>

              <ChartCard index={10} title="Top hotspot locations" subtitle="By reported location text — see Hotspots for map clustering">
                <SingleSeriesBarChart data={data.top_locations} dataKey="count" nameKey="location_text" height={200} />
              </ChartCard>

              <ChartCard index={11} title="Officer workload" subtitle="Active (submitted + in-progress) complaints per officer">
                {data.officer_workload.available ? (
                  <SingleSeriesBarChart data={data.officer_workload.data} dataKey="active_workload" nameKey="officer" height={200} />
                ) : (
                  <p className="text-sm text-ink-soft py-8 text-center">{data.officer_workload.note}</p>
                )}
              </ChartCard>

              <ChartCard index={12} title="Department rating" subtitle="Average citizen feedback rating (out of 5)">
                {data.department_rating.available ? (
                  <SingleSeriesBarChart
                    data={data.department_rating.data.map((r) => ({ ...r, avg_rating: Number(r.avg_rating.toFixed(1)) }))}
                    dataKey="avg_rating"
                    nameKey="department"
                    height={200}
                  />
                ) : (
                  <p className="text-sm text-ink-soft py-8 text-center">{data.department_rating.note}</p>
                )}
              </ChartCard>

              <ChartCard index={13} title="Department performance outlook" subtitle="Operational signals only — not a validated forecast">
                <div className="space-y-3">
                  {data.department_performance.data.map((department) => (
                    <div key={department.id} className="border-b border-paper-line dark:border-board-line pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-ink dark:text-paper">{department.department}</span>
                        <span className={`font-mono text-sm ${department.available ? (department.score >= 75 ? 'text-seal-green' : department.score >= 50 ? 'text-brass' : 'text-stamp-red') : 'text-ink-soft'}`}>
                          {department.available ? `${department.score}% · ${department.outlook}` : department.outlook}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft mt-1">{department.note}</p>
                      {department.available && <p className="text-xs text-ink-soft mt-1">{department.pending_complaints} pending · {department.active_officers} active officer{department.active_officers === 1 ? '' : 's'} · {Math.round(department.assignment_coverage * 100)}% assigned</p>}
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          </>
        )}
      </PageTransition>
    </div>
  );
}
