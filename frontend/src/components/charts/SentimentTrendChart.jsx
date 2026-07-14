import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useChartTheme, SENTIMENT_COLORS } from './chartTheme';

export default function SentimentTrendChart({ data, height = 240 }) {
  const { ink, tooltipStyle } = useChartTheme();

  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke={ink.grid} />
        <XAxis dataKey="month" tick={{ fill: ink.muted, fontSize: 12 }} axisLine={{ stroke: ink.axis }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: ink.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: ink.secondary }} />
        <Bar dataKey="positive" name="Positive" stackId="sentiment" fill={SENTIMENT_COLORS.positive} radius={[0, 0, 0, 0]} maxBarSize={28} />
        <Bar dataKey="neutral" name="Neutral" stackId="sentiment" fill={SENTIMENT_COLORS.neutral} maxBarSize={28} />
        <Bar dataKey="negative" name="Negative" stackId="sentiment" fill={SENTIMENT_COLORS.negative} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
