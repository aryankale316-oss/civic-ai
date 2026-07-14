import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useChartTheme } from './chartTheme';

export default function MonthlyTrendChart({ data, height = 240 }) {
  const { ink, tooltipStyle, sequentialBlue, isDark } = useChartTheme();

  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke={ink.grid} />
        <XAxis
          dataKey="month"
          tick={{ fill: ink.muted, fontSize: 12 }}
          axisLine={{ stroke: ink.axis }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fill: ink.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="count"
          stroke={sequentialBlue}
          strokeWidth={2}
          dot={{ r: 4, fill: sequentialBlue, stroke: isDark ? '#1a1a19' : '#fcfcfb', strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
