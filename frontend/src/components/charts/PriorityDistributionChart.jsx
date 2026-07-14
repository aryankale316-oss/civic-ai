import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useChartTheme, PRIORITY_COLORS, PRIORITY_ORDER } from './chartTheme';

export default function PriorityDistributionChart({ data, height = 200 }) {
  const { ink, tooltipStyle, cursorFill } = useChartTheme();

  if (!data || data.length === 0) {
    return <p className="text-sm text-ink-soft py-8 text-center">No data yet.</p>;
  }

  const sorted = [...data].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: ink.muted, fontSize: 12 }}
          axisLine={{ stroke: ink.grid }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="priority"
          width={90}
          tick={{ fill: ink.secondary, fontSize: 12 }}
          axisLine={{ stroke: ink.grid }}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: cursorFill }} contentStyle={tooltipStyle} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {sorted.map((entry) => (
            <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || PRIORITY_COLORS.Unclassified} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
