import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartTheme } from './chartTheme';

export default function SingleSeriesBarChart({ data, dataKey, nameKey, color, height = 240 }) {
  const { ink, tooltipStyle, cursorFill, sequentialBlue } = useChartTheme();

  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">No data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: ink.muted, fontSize: 12 }}
          axisLine={{ stroke: ink.grid }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey={nameKey}
          width={120}
          tick={{ fill: ink.secondary, fontSize: 12 }}
          axisLine={{ stroke: ink.grid }}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: cursorFill }} contentStyle={tooltipStyle} />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} maxBarSize={22} fill={color || sequentialBlue} />
      </BarChart>
    </ResponsiveContainer>
  );
}
